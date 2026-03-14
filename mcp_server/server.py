"""
server.py — GilsLearn MCP server.

This is what Claude Desktop connects to. It exposes 7 tools that let you
add cards, notes, and projects to GilsLearn just by talking to Claude.

Transport: stdio (Claude Desktop spawns this as a subprocess and communicates
           via stdin/stdout — no port needed).

Tools:
  1. add_card       — add a qa/concept/code_snippet card
  2. add_note       — add a free-text note to a topic
  3. mark_done      — mark a card done by ID
  4. add_project    — add a portfolio project
  5. get_summary    — see your study progress stats
  6. search_cards   — search all cards by keyword
  7. list_cards     — list cards for a domain > topic
"""

import json
import asyncio
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

import api_client
import app_manager

# Create the MCP server instance with a name Claude will display
server = Server("gilslearn")


# ─── Tool Definitions ─────────────────────────────────────────────────────────
# Each @server.list_tools call registers what tools exist and their input schema.
# Each @server.call_tool call handles actually running the tool.

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="add_card",
            description=(
                "Add a study card to GilsLearn. Specify the domain, topic, and card type. "
                "Types: 'qa' (question + answer), 'concept' (title + explanation), "
                "'code_snippet' (title + code + explanation). "
                "Domain and topic are auto-created if they don't exist."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "domain":      {"type": "string", "description": "Domain name, e.g. 'FastAPI'"},
                    "topic":       {"type": "string", "description": "Topic name, e.g. 'Routing'"},
                    "card_type":   {"type": "string", "enum": ["qa", "concept", "code_snippet"]},
                    "question":    {"type": "string", "description": "For qa cards: the question"},
                    "answer":      {"type": "string", "description": "For qa cards: the answer"},
                    "code_example":{"type": "string", "description": "For qa cards: optional code example"},
                    "title":       {"type": "string", "description": "For concept/code_snippet cards"},
                    "explanation": {"type": "string", "description": "For concept/code_snippet cards"},
                    "code":        {"type": "string", "description": "For code_snippet cards: the code"},
                    "tags":        {"type": "array", "items": {"type": "string"}, "description": "List of tags"},
                    "difficulty":  {"type": "string", "enum": ["easy", "medium", "hard"], "default": "medium"},
                },
                "required": ["domain", "topic", "card_type"],
            },
        ),
        types.Tool(
            name="add_note",
            description="Add a free-form text note to a topic in GilsLearn.",
            inputSchema={
                "type": "object",
                "properties": {
                    "domain":  {"type": "string"},
                    "topic":   {"type": "string"},
                    "content": {"type": "string", "description": "The note text"},
                },
                "required": ["domain", "topic", "content"],
            },
        ),
        types.Tool(
            name="mark_done",
            description="Mark a study card as done by its ID.",
            inputSchema={
                "type": "object",
                "properties": {
                    "card_id": {"type": "integer", "description": "The card's numeric ID"},
                },
                "required": ["card_id"],
            },
        ),
        types.Tool(
            name="add_project",
            description="Add a portfolio project to GilsLearn with tech stack and resume bullets.",
            inputSchema={
                "type": "object",
                "properties": {
                    "name":           {"type": "string"},
                    "description":    {"type": "string"},
                    "tech_stack":     {"type": "array", "items": {"type": "string"}},
                    "resume_bullets": {"type": "array", "items": {"type": "string"}},
                    "github_url":     {"type": "string"},
                },
                "required": ["name"],
            },
        ),
        types.Tool(
            name="get_summary",
            description="Get your current study progress: total cards, done count, and per-domain breakdown.",
            inputSchema={"type": "object", "properties": {}},
        ),
        types.Tool(
            name="search_cards",
            description="Search all study cards by keyword. Returns matching cards with their content.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search keyword"},
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="list_cards",
            description="List all study cards for a specific domain and topic.",
            inputSchema={
                "type": "object",
                "properties": {
                    "domain":    {"type": "string"},
                    "topic":     {"type": "string"},
                    "show_done": {"type": "boolean", "default": True, "description": "Include done cards?"},
                },
                "required": ["domain", "topic"],
            },
        ),
        types.Tool(
            name="start_app",
            description="Start the GilsLearn backend (port 8005) and frontend (port 5176).",
            inputSchema={"type": "object", "properties": {}},
        ),
        types.Tool(
            name="stop_app",
            description="Stop the GilsLearn backend and frontend servers.",
            inputSchema={"type": "object", "properties": {}},
        ),
        types.Tool(
            name="app_status",
            description="Check whether the GilsLearn backend and frontend are currently running.",
            inputSchema={"type": "object", "properties": {}},
        ),
    ]


# ─── Tool Execution ───────────────────────────────────────────────────────────

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    """
    Router — receives the tool name + arguments from Claude,
    calls the right api_client function, returns the result as text.
    """
    try:
        if name == "add_card":
            result = api_client.add_card(
                domain=arguments["domain"],
                topic=arguments["topic"],
                card_type=arguments["card_type"],
                question=arguments.get("question", ""),
                answer=arguments.get("answer", ""),
                title=arguments.get("title", ""),
                explanation=arguments.get("explanation", ""),
                code=arguments.get("code", ""),
                code_example=arguments.get("code_example", ""),
                tags=arguments.get("tags", []),
                difficulty=arguments.get("difficulty", "medium"),
            )
            text = (
                f"Card added to {arguments['domain']} > {arguments['topic']}.\n"
                f"ID: {result['id']} | Type: {result['content']['type']} | Done: {result['done']}"
            )

        elif name == "add_note":
            result = api_client.add_note(
                domain=arguments["domain"],
                topic=arguments["topic"],
                content=arguments["content"],
            )
            text = f"Note added to {arguments['domain']} > {arguments['topic']}. ID: {result['id']}"

        elif name == "mark_done":
            result = api_client.mark_done(card_id=arguments["card_id"])
            text = f"Card {result['id']} marked as done."

        elif name == "add_project":
            result = api_client.add_project(
                name=arguments["name"],
                description=arguments.get("description", ""),
                tech_stack=arguments.get("tech_stack", []),
                resume_bullets=arguments.get("resume_bullets", []),
                github_url=arguments.get("github_url", ""),
            )
            text = f"Project '{result['name']}' added. ID: {result['id']}"

        elif name == "get_summary":
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
            text = "\n".join(lines)

        elif name == "search_cards":
            results = api_client.search_cards(query=arguments["query"])
            if not results:
                text = f"No cards found for '{arguments['query']}'."
            else:
                lines = [f"Found {len(results)} card(s) for '{arguments['query']}':\n"]
                for card in results:
                    c = card["content"]
                    label = c.get("question") or c.get("title", "untitled")
                    lines.append(f"  [{card['id']}] ({c['type']}) {label} — done={card['done']}")
                text = "\n".join(lines)

        elif name == "list_cards":
            results = api_client.list_cards(
                domain=arguments["domain"],
                topic=arguments["topic"],
                show_done=arguments.get("show_done", True),
            )
            if not results:
                text = f"No cards in {arguments['domain']} > {arguments['topic']}."
            else:
                lines = [f"{len(results)} card(s) in {arguments['domain']} > {arguments['topic']}:\n"]
                for card in results:
                    c = card["content"]
                    label = c.get("question") or c.get("title", "untitled")
                    done_mark = "✓" if card["done"] else "○"
                    lines.append(f"  {done_mark} [{card['id']}] ({c['type']}) {label}")
                text = "\n".join(lines)

        elif name == "start_app":
            text = await asyncio.to_thread(app_manager.start_app)

        elif name == "stop_app":
            text = await asyncio.to_thread(app_manager.stop_app)

        elif name == "app_status":
            text = await asyncio.to_thread(app_manager.app_status)

        else:
            text = f"Unknown tool: {name}"

    except Exception as e:
        text = f"Error running tool '{name}': {str(e)}"

    return [types.TextContent(type="text", text=text)]


# ─── Entry point ──────────────────────────────────────────────────────────────

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
