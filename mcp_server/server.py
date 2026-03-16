"""
server.py — GLearn Remote MCP server (Streamable HTTP transport).

This is what Claude Desktop connects to over HTTPS. It exposes 7 tools
that let you add cards, notes, and projects to GLearn just by talking
to Claude.

Transport: Streamable HTTP (runs as an HTTP server behind Nginx + SSL).
           Claude Desktop connects via: https://gleam-gil.duckdns.org/mcp

Tools:
  1. add_card       — add a qa/concept/code_snippet card
  2. add_note       — add a free-text note to a topic
  3. mark_done      — mark a card done by ID
  4. add_project    — add a portfolio project
  5. get_summary    — see your study progress stats
  6. search_cards   — search all cards by keyword
  7. list_cards     — list cards for a domain > topic
"""

import os
from typing import Optional

import uvicorn
from mcp.server.fastmcp import FastMCP

import api_client

# ─── FastMCP instance ────────────────────────────────────────────────────────
# stateless_http=True  → no session state between requests (safe for load balancing)
# json_response=True   → return JSON instead of SSE (simpler for Claude Desktop)

mcp = FastMCP("gleam", stateless_http=True, json_response=True)


# ─── Tool Definitions ────────────────────────────────────────────────────────
# FastMCP auto-generates JSON schemas from Python type hints — no manual
# inputSchema dicts needed.

@mcp.tool()
def add_card(
    domain: str,
    topic: str,
    card_type: str,
    question: str = "",
    answer: str = "",
    code_example: str = "",
    title: str = "",
    explanation: str = "",
    code: str = "",
    tags: Optional[list[str]] = None,
    difficulty: str = "medium",
) -> str:
    """Add a study card to GLearn. Types: 'qa', 'concept', 'code_snippet'."""
    result = api_client.add_card(
        domain=domain,
        topic=topic,
        card_type=card_type,
        question=question,
        answer=answer,
        title=title,
        explanation=explanation,
        code=code,
        code_example=code_example,
        tags=tags or [],
        difficulty=difficulty,
    )
    return (
        f"Card added to {domain} > {topic}.\n"
        f"ID: {result['id']} | Type: {result['content']['type']} | Done: {result['done']}"
    )


@mcp.tool()
def add_note(domain: str, topic: str, content: str) -> str:
    """Add a free-form text note to a topic in GLearn."""
    result = api_client.add_note(domain=domain, topic=topic, content=content)
    return f"Note added to {domain} > {topic}. ID: {result['id']}"


@mcp.tool()
def mark_done(card_id: int) -> str:
    """Mark a study card as done by its ID."""
    result = api_client.mark_done(card_id=card_id)
    return f"Card {result['id']} marked as done."


@mcp.tool()
def add_project(
    name: str,
    description: str = "",
    tech_stack: Optional[list[str]] = None,
    resume_bullets: Optional[list[str]] = None,
    github_url: str = "",
) -> str:
    """Add a portfolio project to GLearn with tech stack and resume bullets."""
    result = api_client.add_project(
        name=name,
        description=description,
        tech_stack=tech_stack or [],
        resume_bullets=resume_bullets or [],
        github_url=github_url,
    )
    return f"Project '{result['name']}' added. ID: {result['id']}"


@mcp.tool()
def get_summary() -> str:
    """Get your current study progress: total cards, done count, and per-domain breakdown."""
    result = api_client.get_summary()
    lines = [
        f"Total cards: {result['total_cards']}",
        f"Done: {result['done_count']} ({result['percent_done']}%)",
        "",
        "By domain:",
    ]
    for d in result["by_domain"]:
        pct = round(d["done_count"] / d["card_count"] * 100) if d["card_count"] > 0 else 0
        lines.append(f"  {d['domain_name']}: {d['done_count']}/{d['card_count']} ({pct}%)")
    return "\n".join(lines)


@mcp.tool()
def search_cards(query: str) -> str:
    """Search all study cards by keyword. Returns matching cards with their content."""
    results = api_client.search_cards(query=query)
    if not results:
        return f"No cards found for '{query}'."
    lines = [f"Found {len(results)} card(s) for '{query}':\n"]
    for card in results:
        c = card["content"]
        label = c.get("question") or c.get("title", "untitled")
        lines.append(f"  [{card['id']}] ({c['type']}) {label} — done={card['done']}")
    return "\n".join(lines)


@mcp.tool()
def list_cards(domain: str, topic: str, show_done: bool = True) -> str:
    """List all study cards for a specific domain and topic."""
    results = api_client.list_cards(domain=domain, topic=topic, show_done=show_done)
    if not results:
        return f"No cards in {domain} > {topic}."
    lines = [f"{len(results)} card(s) in {domain} > {topic}:\n"]
    for card in results:
        c = card["content"]
        label = c.get("question") or c.get("title", "untitled")
        done_mark = "\u2713" if card["done"] else "\u25cb"
        lines.append(f"  {done_mark} [{card['id']}] ({c['type']}) {label}")
    return "\n".join(lines)


# ─── ASGI Middleware ──────────────────────────────────────────────────────────
# Nginx forwards requests with Host: gleam-gil.duckdns.org, but Starlette's
# TrustedHostMiddleware rejects anything that isn't localhost. This middleware
# rewrites the Host header so Starlette is happy.

class RewriteHostMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            new_headers = []
            for key, value in scope["headers"]:
                if key == b"host":
                    new_headers.append((key, b"localhost:8081"))
                else:
                    new_headers.append((key, value))
            scope = dict(scope, headers=new_headers)
        await self.app(scope, receive, send)


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("MCP_PORT", "8081"))
    mcp_app = mcp.streamable_http_app()
    app = RewriteHostMiddleware(mcp_app)
    uvicorn.run(app, host="0.0.0.0", port=port)
