# DJ Loop - Project Status

## What DJ Loop Is

An autonomous idea-to-product pipeline. Input any idea (bug, feature, tweet, random thought) → AI generates a PRD → you approve → it builds automatically.

**Flow (2 steps):**
```
INPUT + AUTO-PRD → APPROVE → BUILD → DEPLOY
      ↑                ↑         ↑
   one click      you review   autonomous
```

---

## Goals

### Core Goals
- [x] Input any idea in seconds (manual, tweet URL, bug report, feature request)
- [x] AI auto-generates a spec/PRD from rough input
- [x] Approve/kill PRDs from dashboard
- [ ] Autonomous build from approved PRD (no hand-holding)
- [ ] Auto-deploy to Vercel, get live link

### Stretch Goals
- [ ] Learning system (auto-approve obvious wins based on patterns)
- [ ] SMS/Slack notifications when PRDs ready for approval
- [ ] Chrome extension for capturing tweets directly
- [ ] Parallel builds (multiple projects building simultaneously)
- [ ] Cost tracking per build
- [ ] Modify PRD before approving

---

## What's Built

### Infrastructure
- [x] Project structure (`apps/dashboard`, `packages/*`, `supabase/`)
- [x] Supabase schema with `dj_` prefixed tables (safe for shared project)
- [x] Database: `dj_ideas`, `dj_builds`, `dj_preferences` tables
- [x] Views: `dj_queue_stats`, `dj_active_builds`, `dj_recent_ships`
- [x] Real-time subscriptions enabled

### Dashboard (Next.js + shadcn/ui)
- [x] Main dashboard page with queue stats
- [x] **Streamlined input: "Create & Generate PRD" in one button**
- [x] PRD generation API route (uses Claude API or template fallback)
- [x] Pending approvals with approve/kill buttons
- [x] PRD viewer dialog
- [x] Active builds display (empty until build engine exists)
- [x] Recent ships display (empty until builds complete)
- [x] Dark mode, minimal UI

### Config
- [x] `.env.local` with Supabase credentials
- [x] Connected to existing Supabase project (shared with Loomiverse, tables prefixed `dj_`)

### Tested
- [x] Dashboard runs locally
- [x] Create idea + generate PRD works
- [x] Approve flow works

---

## Task List (What's Left)

### Phase 1: Build Engine (The Hard Part) - ✅ IMPLEMENTED
- [x] Create build runner script that:
  - Picks up approved ideas from `dj_ideas` where `status = 'approved'`
  - Creates a new repo from PRD (via `gh` CLI)
  - Runs Claude Code CLI to implement the PRD
  - Updates `dj_builds` with progress (real-time via Supabase)
  - Commits, pushes to GitHub
  - Deploys to Vercel (for utility-app, adhd-game projects)
  - Updates status to `shipped` with `deployed_url`
- [x] Decision: Using Claude Code CLI + gh CLI + Vercel CLI
- [x] Created `/api/start-build` endpoint
- [x] Auto-triggers build on "Approve & Build" click

**Prerequisites for build engine:**
- `gh` CLI installed and authenticated: `brew install gh && gh auth login`
- `vercel` CLI installed: `npm i -g vercel`
- `claude` CLI installed: `npm i -g @anthropic-ai/claude-code`

### Phase 2: Polish
- [ ] Add "Modify PRD" flow (edit before approving)
- [ ] Add SMS/Slack notifications for pending approvals
- [ ] Add cost estimation to PRD generation
- [ ] Mobile-responsive testing

### Phase 3: Automation
- [ ] Cron job or webhook to auto-run build loop
- [ ] Auto-approve rules based on learned patterns
- [ ] Chrome extension for tweet capture

---

## Quick Commands

```bash
# Start dashboard
cd /Users/dannyjonesphotography/Desktop/DJ-Projects/dj-loop/apps/dashboard
npm run dev

# Build for production
npm run build

# Check Supabase tables
# Go to: https://supabase.com/dashboard/project/eoiyyegxwehmpivpfodi/editor
```

---

## Key Files

```
dj-loop/
├── apps/dashboard/
│   ├── src/app/page.tsx              # Main dashboard
│   ├── src/app/api/generate-prd/     # PRD generation endpoint
│   ├── src/app/api/start-build/      # Build trigger endpoint
│   ├── src/app/api/start-world-build/# World generation endpoint (NEW)
│   ├── src/components/
│   │   ├── idea-input.tsx            # Create & Generate PRD (streamlined)
│   │   ├── pending-approvals.tsx     # Approve & Build UI (auto-triggers build)
│   │   ├── active-builds.tsx         # Build progress with real-time updates
│   │   └── recent-ships.tsx          # Shipped projects
│   ├── src/lib/supabase.ts           # DB client + types
│   └── .env.local                    # Supabase credentials
├── supabase/migrations/
│   ├── 001_initial_schema.sql        # Database schema (dj_ prefixed)
│   └── 002_world_builder.sql         # World generation tables (NEW)
├── packages/
│   ├── builder/index.ts              # Build engine core logic
│   ├── world-builder/                # Character world generation (NEW)
│   │   ├── src/types.ts              # WorldTemplate, WorldCharacter types
│   │   ├── src/options.ts            # 8-layer psychology options
│   │   ├── src/generator.ts          # Character generation logic
│   │   └── src/runner.ts             # Overnight batch runner
│   ├── bird-client/                  # Twitter API (not wired yet)
│   └── notifier/                     # SMS/Slack (not wired yet)
└── STATUS.md                         # This file
```

---

## World Builder (NEW)

Generates populated worlds with deeply layered characters using Loomiverse's 8-layer psychology system.

### Flow
```
DEFINE WORLD → APPROVE → OVERNIGHT GENERATION → CHARACTERS READY
     ↑             ↑              ↑
  template     you review    runs automatically
```

### What It Does
- Takes a World Template (sci-fi city, fantasy kingdom, etc.)
- Generates 20+ characters overnight using Claude API
- Each character has full 8-layer psychology:
  1. World Context
  2. Cultural Identity
  3. Generational Echoes
  4. Family Structure
  5. Atmospheric Conditions
  6. Biology
  7. Embodiment
  8. Attachment

### Database Tables
- `dj_worlds` - World templates
- `dj_world_jobs` - Generation job progress
- `dj_world_characters` - Generated characters

### API Endpoints
- `POST /api/start-world-build` - Start generation for approved world
- `GET /api/start-world-build?jobId=xxx` - Check job status

### Example World Template
```json
{
  "name": "Neo-Tokyo 2150",
  "era": "Far Future",
  "neighborhoods": [
    { "name": "Corporate Spires", "social_class": "upper" },
    { "name": "Undercity", "social_class": "lower" }
  ],
  "factions": ["Nexus Corporation", "The Unplugged"],
  "character_count": 20
}
```

### Next Steps for World Builder
- [ ] Add world template input UI to dashboard
- [ ] Add world generation progress display
- [x] Export characters to Loomiverse format (via MCP)
- [ ] Add relationship visualization

---

## World Builder MCP (NEW)

An MCP server that exposes world-building tools to any Claude interface.

### Tools Available
| Tool | What It Does |
|------|--------------|
| `create_world` | Create detailed world template |
| `create_quick_world` | Create from simple description |
| `list_worlds` | See all worlds |
| `approve_world` | Approve for generation |
| `start_generation` | Kick off overnight job |
| `check_progress` | Monitor progress |
| `get_characters` | Get generated characters |
| `export_to_loomiverse` | Export to Loomiverse format |

### Setup
```bash
# Build
cd packages/world-builder-mcp
npm install && npm run build

# Add to Claude Code settings (~/.claude/settings.json):
{
  "mcpServers": {
    "world-builder": {
      "command": "node",
      "args": ["/path/to/dj-loop/packages/world-builder-mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your-url",
        "SUPABASE_KEY": "your-key",
        "WORLD_BUILDER_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Usage
Just tell Claude what you want:
> "Create a cyberpunk city with 20 characters and start generating overnight"

Claude will use the MCP tools automatically

---

## Context for Next Session

- **Dashboard works** - tested end-to-end (input → PRD → approve → build)
- **Flow is streamlined** - 2 steps: "Create & Generate PRD" then "Approve & Build"
- **Database** - Tables exist in shared Supabase project (`dj_` prefix)
- **Build engine** - Implemented! Uses Claude Code CLI + gh + Vercel CLIs
- **Next priority** - Test full build flow end-to-end, then add "Modify PRD" flow

**Before testing builds, ensure CLIs are installed:**
```bash
gh auth status       # GitHub CLI auth check
vercel whoami        # Vercel CLI auth check
claude --version     # Claude Code CLI check
```

## Supabase Project

- URL: `https://eoiyyegxwehmpivpfodi.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/eoiyyegxwehmpivpfodi
- Tables: `dj_ideas`, `dj_builds`, `dj_preferences`
