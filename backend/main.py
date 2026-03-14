"""
main.py — FastAPI application entry point.

What happens here:
  1. App is created with metadata (title, version)
  2. CORS middleware is added so the React frontend (localhost:5174) can call the API
  3. All routers are registered (domains, cards, notes, projects)
  4. /topics and /stats endpoints are defined here (they're small enough to not need their own file)
  5. On startup, seed domains and sample cards are inserted if the DB is empty

Run with:
  uv run uvicorn main:app --host 0.0.0.0 --port 8005 --reload
"""

from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Domain, Topic, Card
from schemas import TopicCreate, TopicMove, TopicOut, StatsOut, DomainStat
from routers import domains, cards, notes, projects

app = FastAPI(title="GilsLearn API", version="1.0.0")

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Allow all origins so the React dev server at localhost:5174 can talk to us.
# This is fine for a local-only tool — never do this in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(domains.router)
app.include_router(cards.router)
app.include_router(notes.router)
app.include_router(projects.router)


# ─── Topics ───────────────────────────────────────────────────────────────────

@app.get("/topics", response_model=list[TopicOut], tags=["topics"])
def list_topics(domain_id: int = Query(...), db: Session = Depends(get_db)):
    """List all topics for a domain, with card/done counts."""
    topics = (
        db.query(Topic)
        .filter(Topic.domain_id == domain_id)
        .order_by(Topic.created_at)
        .all()
    )
    result = []
    for topic in topics:
        total = db.query(func.count(Card.id)).filter(Card.topic_id == topic.id).scalar()
        done  = db.query(func.count(Card.id)).filter(Card.topic_id == topic.id, Card.done == True).scalar()
        result.append(TopicOut(
            id=topic.id,
            domain_id=topic.domain_id,
            name=topic.name,
            created_at=topic.created_at,
            card_count=total or 0,
            done_count=done or 0,
        ))
    return result


@app.delete("/topics/{topic_id}", status_code=204, tags=["topics"])
def delete_topic(topic_id: int, db: Session = Depends(get_db)):
    """Delete a topic and all its cards and notes (cascade)."""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Topic not found")
    db.delete(topic)
    db.commit()


@app.post("/topics", response_model=TopicOut, status_code=201, tags=["topics"])
def create_topic(payload: TopicCreate, db: Session = Depends(get_db)):
    """Create a new topic inside a domain."""
    topic = Topic(domain_id=payload.domain_id, name=payload.name)
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return TopicOut(
        id=topic.id,
        domain_id=topic.domain_id,
        name=topic.name,
        created_at=topic.created_at,
        card_count=0,
        done_count=0,
    )


@app.post("/topics/move", response_model=list[TopicOut], tags=["topics"])
def move_topics(payload: TopicMove, db: Session = Depends(get_db)):
    """Move one or more topics to a different domain. All cards and notes follow."""
    from fastapi import HTTPException

    # Validate target domain exists
    target = db.query(Domain).filter(Domain.id == payload.target_domain_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target domain not found")

    topics = db.query(Topic).filter(Topic.id.in_(payload.topic_ids)).all()
    if not topics:
        raise HTTPException(status_code=404, detail="No matching topics found")

    for topic in topics:
        topic.domain_id = payload.target_domain_id

    db.commit()

    result = []
    for topic in topics:
        db.refresh(topic)
        total = db.query(func.count(Card.id)).filter(Card.topic_id == topic.id).scalar()
        done = db.query(func.count(Card.id)).filter(Card.topic_id == topic.id, Card.done == True).scalar()
        result.append(TopicOut(
            id=topic.id,
            domain_id=topic.domain_id,
            name=topic.name,
            created_at=topic.created_at,
            card_count=total or 0,
            done_count=done or 0,
        ))
    return result


# ─── Stats ────────────────────────────────────────────────────────────────────

@app.get("/stats", response_model=StatsOut, tags=["stats"])
def get_stats(db: Session = Depends(get_db)):
    """
    Global study stats. Used for the dashboard header:
      - Total cards across all domains
      - How many are done
      - Percentage done
      - Per-domain breakdown
    """
    total = db.query(func.count(Card.id)).scalar() or 0
    done  = db.query(func.count(Card.id)).filter(Card.done == True).scalar() or 0
    percent = round((done / total * 100), 1) if total > 0 else 0.0

    domains_list = db.query(Domain).all()
    by_domain = []
    for domain in domains_list:
        d_total = (
            db.query(func.count(Card.id))
            .join(Topic, Card.topic_id == Topic.id)
            .filter(Topic.domain_id == domain.id)
            .scalar()
        )
        d_done = (
            db.query(func.count(Card.id))
            .join(Topic, Card.topic_id == Topic.id)
            .filter(Topic.domain_id == domain.id, Card.done == True)
            .scalar()
        )
        by_domain.append(DomainStat(
            domain_id=domain.id,
            domain_name=domain.name,
            card_count=d_total or 0,
            done_count=d_done or 0,
        ))

    return StatsOut(total_cards=total, done_count=done, percent_done=percent, by_domain=by_domain)


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "app": "GilsLearn API", "version": "1.0.0"}


# ─── Seed Data ────────────────────────────────────────────────────────────────

SEED_DOMAINS = [
    {"name": "DSA / LeetCode",       "icon": "🧮", "color": "#3B82F6"},
    {"name": "FastAPI",              "icon": "⚡", "color": "#10B981"},
    {"name": "LangChain / LangGraph","icon": "🦜", "color": "#8B5CF6"},
    {"name": "MCP & Agentic AI",     "icon": "🤖", "color": "#F59E0B"},
    {"name": "Python Internals",     "icon": "🐍", "color": "#EF4444"},
    {"name": "System Design",        "icon": "🏗",  "color": "#6366F1"},
    {"name": "My Projects",          "icon": "📁", "color": "#EC4899"},
]

# 2 sample cards per domain — one qa, one concept
SEED_CARDS = {
    "DSA / LeetCode": {
        "topic": "Arrays",
        "cards": [
            {
                "type": "qa",
                "question": "What is the Two Pointer technique?",
                "answer": "Use two indices that move toward each other (or in the same direction) to solve problems in O(n) instead of O(n²). Classic uses: sorted pair sum, removing duplicates.",
                "code_example": "left, right = 0, len(arr) - 1\nwhile left < right:\n    s = arr[left] + arr[right]\n    if s == target: return [left, right]\n    elif s < target: left += 1\n    else: right -= 1",
                "tags": ["arrays", "two-pointer"],
                "difficulty": "medium",
            },
            {
                "type": "concept",
                "title": "Sliding Window",
                "explanation": "Maintain a window of elements using two pointers. Expand the right pointer to grow the window, shrink the left pointer when a constraint is violated. Useful for subarray/substring problems in O(n).",
                "tags": ["arrays", "sliding-window"],
                "difficulty": "medium",
            },
        ],
    },
    "FastAPI": {
        "topic": "Routing",
        "cards": [
            {
                "type": "qa",
                "question": "What does Depends() do in FastAPI?",
                "answer": "It declares a dependency — FastAPI calls the function you pass in, injects its return value into your route. Used for DB sessions, auth, shared logic.",
                "code_example": "def get_db():\n    db = SessionLocal()\n    try:\n        yield db\n    finally:\n        db.close()\n\n@app.get('/items')\ndef read_items(db: Session = Depends(get_db)):\n    ...",
                "tags": ["fastapi", "dependency-injection"],
                "difficulty": "easy",
            },
            {
                "type": "concept",
                "title": "Path vs Query Parameters",
                "explanation": "Path params are part of the URL (/items/{id}). Query params come after ? (/items?skip=0&limit=10). FastAPI infers which is which from the function signature — if the param name is in the path string it's a path param, otherwise it's a query param.",
                "tags": ["fastapi", "routing"],
                "difficulty": "easy",
            },
        ],
    },
    "LangChain / LangGraph": {
        "topic": "LangGraph Basics",
        "cards": [
            {
                "type": "concept",
                "title": "LangGraph State Machine",
                "explanation": "LangGraph models an agent as a directed graph. Nodes are Python functions that receive and return state. Edges define control flow — which node runs next. State is a TypedDict that gets passed and updated through the graph.",
                "tags": ["langgraph", "agents", "state"],
                "difficulty": "hard",
            },
            {
                "type": "qa",
                "question": "What is the difference between LangChain chains and LangGraph?",
                "answer": "LangChain chains are linear (step 1 → step 2 → ...). LangGraph supports cycles, conditional branching, and persistent state — enabling true agentic loops where the agent can retry, branch, or call tools repeatedly.",
                "code_example": "",
                "tags": ["langchain", "langgraph"],
                "difficulty": "medium",
            },
        ],
    },
    "MCP & Agentic AI": {
        "topic": "MCP Protocol",
        "cards": [
            {
                "type": "concept",
                "title": "What is MCP?",
                "explanation": "Model Context Protocol (MCP) is an open standard for connecting AI models to external tools and data. An MCP server exposes tools (functions) that a Claude client can call. Servers communicate via stdio or HTTP+SSE.",
                "tags": ["mcp", "protocol"],
                "difficulty": "medium",
            },
            {
                "type": "qa",
                "question": "What is the difference between MCP tools and resources?",
                "answer": "Tools are functions the model can call to take actions (e.g. write a file, query a DB). Resources are read-only data sources the model can access for context (e.g. a file's content, a DB record). Tools = actions, Resources = context.",
                "code_example": "",
                "tags": ["mcp", "tools", "resources"],
                "difficulty": "medium",
            },
        ],
    },
    "Python Internals": {
        "topic": "Concurrency",
        "cards": [
            {
                "type": "qa",
                "question": "What is the GIL and why does it matter?",
                "answer": "The Global Interpreter Lock (GIL) is a mutex in CPython that allows only one thread to execute Python bytecode at a time. This means CPU-bound multi-threaded Python code doesn't parallelize. Use multiprocessing for CPU work, asyncio/threads for I/O work.",
                "code_example": "",
                "tags": ["python", "gil", "threading", "concurrency"],
                "difficulty": "medium",
            },
            {
                "type": "concept",
                "title": "asyncio Event Loop",
                "explanation": "asyncio runs a single-threaded event loop. When an async function hits 'await', it yields control back to the loop so other coroutines can run. No threads needed for I/O-bound concurrency. CPU-bound tasks still block the loop — use run_in_executor for those.",
                "tags": ["python", "asyncio", "concurrency"],
                "difficulty": "hard",
            },
        ],
    },
    "System Design": {
        "topic": "Fundamentals",
        "cards": [
            {
                "type": "concept",
                "title": "CAP Theorem",
                "explanation": "A distributed system can guarantee at most 2 of: Consistency (every read gets the latest write), Availability (every request gets a response), Partition Tolerance (system works despite network splits). Since partitions always happen in real networks, you choose CP or AP.",
                "tags": ["system-design", "distributed-systems", "cap"],
                "difficulty": "hard",
            },
            {
                "type": "qa",
                "question": "When would you use a message queue like Kafka?",
                "answer": "When you need to decouple producers from consumers, handle traffic spikes (buffer), guarantee delivery, enable event replay, or fan-out events to multiple consumers. Kafka is durable, high-throughput, and ordered within a partition.",
                "code_example": "",
                "tags": ["system-design", "kafka", "messaging"],
                "difficulty": "medium",
            },
        ],
    },
    "My Projects": {
        "topic": "GilsLearn",
        "cards": [
            {
                "type": "concept",
                "title": "GilsLearn Architecture",
                "explanation": "Personal study platform. Stack: React (Vite) + FastAPI + PostgreSQL + MCP server. The MCP server lets Claude Desktop add cards/notes directly via conversation. Cards use JSONB for flexible content types (qa, concept, code_snippet).",
                "tags": ["project", "fastapi", "react", "mcp"],
                "difficulty": "easy",
            },
            {
                "type": "qa",
                "question": "Why use JSONB for card content instead of separate columns?",
                "answer": "Cards have 3 different shapes (qa has question+answer, concept has title+explanation, code_snippet has title+code+explanation). JSONB stores all types in one column without needing a union table or nullable columns. PostgreSQL can also index and query JSONB fields.",
                "code_example": "",
                "tags": ["postgresql", "jsonb", "design"],
                "difficulty": "easy",
            },
        ],
    },
}


def seed_database(db: Session):
    """
    Insert seed domains and sample cards on first run.
    Checks if domains table is empty before inserting — safe to call on every startup.
    """
    if db.query(Domain).count() > 0:
        return  # Already seeded

    print("Seeding database with initial domains and sample cards...")

    for domain_data in SEED_DOMAINS:
        domain = Domain(
            name=domain_data["name"],
            icon=domain_data["icon"],
            color=domain_data["color"],
        )
        db.add(domain)
        db.flush()  # flush to get domain.id without committing yet

        seed = SEED_CARDS.get(domain_data["name"])
        if seed:
            topic = Topic(domain_id=domain.id, name=seed["topic"])
            db.add(topic)
            db.flush()

            for card_content in seed["cards"]:
                card = Card(topic_id=topic.id, content=card_content)
                db.add(card)

    db.commit()
    print("Seed complete.")


@app.on_event("startup")
def on_startup():
    """Run seed when the server starts."""
    db = next(get_db())
    try:
        seed_database(db)
    finally:
        db.close()
