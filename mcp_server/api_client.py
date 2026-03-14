"""
api_client.py — HTTP helpers that talk to the GilsLearn FastAPI backend.

All functions are synchronous (httpx sync client).
The MCP server calls these functions when Claude triggers a tool.

BASE_URL defaults to localhost:8001 but can be overridden via env var.
"""

import os
import httpx

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8005")


def _get(path: str, params: dict = None):
    with httpx.Client(base_url=BASE_URL, timeout=10) as client:
        res = client.get(path, params=params)
        res.raise_for_status()
        return res.json()


def _post(path: str, body: dict):
    with httpx.Client(base_url=BASE_URL, timeout=10) as client:
        res = client.post(path, json=body)
        res.raise_for_status()
        return res.json()


def _patch(path: str, body: dict):
    with httpx.Client(base_url=BASE_URL, timeout=10) as client:
        res = client.patch(path, json=body)
        res.raise_for_status()
        return res.json()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_or_create_domain(name: str) -> int:
    """Return domain id by name, creating it if it doesn't exist."""
    domains = _get("/domains")
    for d in domains:
        if d["name"].lower() == name.lower():
            return d["id"]
    # Not found — create it
    new = _post("/domains", {"name": name, "icon": "📚", "color": "#3B82F6"})
    return new["id"]


def _get_or_create_topic(domain_id: int, topic_name: str) -> int:
    """Return topic id by name within a domain, creating it if needed."""
    topics = _get("/topics", params={"domain_id": domain_id})
    for t in topics:
        if t["name"].lower() == topic_name.lower():
            return t["id"]
    new = _post("/topics", {"domain_id": domain_id, "name": topic_name})
    return new["id"]


# ─── Public API ───────────────────────────────────────────────────────────────

def add_card(
    domain: str,
    topic: str,
    card_type: str,
    question: str = "",
    answer: str = "",
    title: str = "",
    explanation: str = "",
    code: str = "",
    code_example: str = "",
    tags: list[str] = None,
    difficulty: str = "medium",
) -> dict:
    """
    Add a study card. Auto-creates domain and topic if they don't exist.

    card_type must be one of: qa, concept, code_snippet
    """
    domain_id = _get_or_create_domain(domain)
    topic_id  = _get_or_create_topic(domain_id, topic)

    tags = tags or []

    if card_type == "qa":
        content = {
            "type": "qa",
            "question": question,
            "answer": answer,
            "code_example": code_example,
            "tags": tags,
            "difficulty": difficulty,
        }
    elif card_type == "concept":
        content = {
            "type": "concept",
            "title": title,
            "explanation": explanation,
            "tags": tags,
            "difficulty": difficulty,
        }
    elif card_type == "code_snippet":
        content = {
            "type": "code_snippet",
            "title": title,
            "code": code,
            "explanation": explanation,
            "tags": tags,
            "difficulty": difficulty,
        }
    else:
        raise ValueError(f"Unknown card type: {card_type}. Use qa, concept, or code_snippet.")

    return _post("/cards", {"topic_id": topic_id, "content": content})


def add_note(domain: str, topic: str, content: str) -> dict:
    """Add a free-form text note to a topic. Auto-creates domain/topic if needed."""
    domain_id = _get_or_create_domain(domain)
    topic_id  = _get_or_create_topic(domain_id, topic)
    return _post("/notes", {"topic_id": topic_id, "content": content})


def mark_done(card_id: int) -> dict:
    """Mark a card as done by its ID."""
    return _patch(f"/cards/{card_id}", {"done": True})


def add_project(
    name: str,
    description: str = "",
    tech_stack: list[str] = None,
    resume_bullets: list[str] = None,
    github_url: str = "",
) -> dict:
    """Add a portfolio project."""
    return _post("/projects", {
        "name": name,
        "description": description or None,
        "tech_stack": tech_stack or [],
        "links": {"github": github_url} if github_url else None,
        "resume_bullets": resume_bullets or [],
    })


def get_summary() -> dict:
    """Get global study stats — total cards, done count, per-domain breakdown."""
    return _get("/stats")


def search_cards(query: str) -> list:
    """Search all cards for a keyword. Returns matching card objects."""
    return _get("/cards/search", params={"q": query})


def list_cards(domain: str, topic: str, show_done: bool = True) -> list:
    """List cards for a specific domain > topic."""
    domain_id = _get_or_create_domain(domain)
    topic_id  = _get_or_create_topic(domain_id, topic)
    cards = _get("/cards", params={"topic_id": topic_id})
    if not show_done:
        cards = [c for c in cards if not c["done"]]
    return cards
