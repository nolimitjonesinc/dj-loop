# World Builder MCP Server

An MCP (Model Context Protocol) server that lets you generate populated worlds with deeply layered characters from any Claude interface.

## What It Does

Creates worlds full of characters, each with:
- **8-layer psychology** (from Loomiverse's system)
- **Life simulation** (80-150 childhood events)
- **AI elaborations** (detailed backstories, voice samples)
- **Relationships** between characters

## Available Tools

| Tool | Description |
|------|-------------|
| `create_world` | Create a detailed world template |
| `create_quick_world` | Create a world from a simple description |
| `list_worlds` | See all your worlds |
| `get_world` | Get world details |
| `approve_world` | Approve for generation |
| `start_generation` | Kick off overnight generation |
| `check_progress` | Monitor generation progress |
| `get_characters` | Get generated characters |
| `get_character` | Get one character's full details |
| `export_to_loomiverse` | Export to Loomiverse format |

## Installation

### 1. Build the package

```bash
cd packages/world-builder-mcp
npm install
npm run build
```

### 2. Configure Claude Code

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "world-builder": {
      "command": "node",
      "args": ["/path/to/dj-loop/packages/world-builder-mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_KEY": "your-supabase-key",
        "WORLD_BUILDER_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 3. Configure Claude Desktop (optional)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "world-builder": {
      "command": "node",
      "args": ["/path/to/dj-loop/packages/world-builder-mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_KEY": "your-supabase-key",
        "WORLD_BUILDER_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Usage Examples

### Create a world from a description

```
"Create a cyberpunk city with corporate overlords and an underground resistance,
then generate 20 characters overnight"
```

Claude will use:
1. `create_quick_world` - Creates the template
2. `approve_world` - Approves it
3. `start_generation` - Kicks off the job

### Create a detailed world

```
"Create a world called 'Neo-Tokyo 2150' with:
- Neighborhoods: Corporate Spires (upper class), Market Ring (middle), Undercity (lower)
- Factions: Nexus Corporation, The Unplugged resistance
- Key event: The Blackout of 2120 (30 years ago, catastrophic)
Then approve it and start generating 20 characters"
```

### Check on progress

```
"How's the character generation going for Neo-Tokyo?"
```

### Get the characters

```
"Show me all the characters from Neo-Tokyo 2150"
```

### Export for Loomiverse

```
"Export the Neo-Tokyo characters to Loomiverse format"
```

## Prerequisites

1. **Dashboard running** - The API endpoint needs to be accessible
   ```bash
   cd apps/dashboard
   npm run dev
   ```

2. **Database migrated** - Run the world-builder migration
   ```sql
   -- In Supabase SQL editor, run:
   -- supabase/migrations/002_world_builder.sql
   ```

3. **Environment variables** set for the MCP server

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Claude Chat    │────▶│  MCP Server     │────▶│  Supabase DB    │
│  (any client)   │     │  (this package) │     │  (world data)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Dashboard API  │
                        │  (generation)   │
                        └─────────────────┘
```

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Run directly
npm start
```
