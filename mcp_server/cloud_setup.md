# MCP Server — Cloud Setup

The MCP server always runs **locally on your Mac** (Claude Desktop spawns it).
For cloud deployment, you just point it at the Cloud Run backend instead of localhost.

## Configure the MCP server for cloud

Set `API_BASE_URL` in your shell environment **or** in your Claude Desktop MCP config:

### Option A — Claude Desktop config (`~/.claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "gleam": {
      "command": "uv",
      "args": ["run", "python", "main.py"],
      "cwd": "/path/to/GLearn/mcp_server",
      "env": {
        "API_BASE_URL": "https://gleam-backend-XXXXXXXXXX-uc.a.run.app"
      }
    }
  }
}
```

### Option B — Shell environment

Add to `~/.zshrc`:
```bash
export API_BASE_URL=https://gleam-backend-XXXXXXXXXX-uc.a.run.app
```

## What still works remotely

All MCP tools work over the cloud backend:
- `add_card`, `add_note`, `mark_done`, `add_project`
- `get_summary`, `search_cards`, `list_cards`

## What changes for cloud

- `start_app` / `stop_app` / `app_status` — these manage local processes and are
  no longer needed. They will still run without error but have no effect on the
  cloud-hosted services.

## Run the MCP server locally (unchanged)

```bash
cd mcp_server/
uv run python main.py
```
