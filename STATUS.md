# DJ Loop — Status
_Auto-updated by Status Brain on every push. Last change: Added Status Brain workflow and script to auto-generate this file on each push._

**Status:** In progress  
**What it is:** An autonomous idea-to-product pipeline that turns rough ideas into approved PRDs, then builds and deploys them automatically.  
**Stack:** Next.js, TypeScript, Supabase, Claude API, shadcn/ui, pnpm monorepo.

## What works right now
- Dashboard displays queue stats, pending approvals, active builds, recent ships
- One-click "Create & Generate PRD" flow (combines idea input + AI spec generation)
- PRD generation via Claude API (with template fallback)
- Approve/kill PRDs from dashboard UI
- Build trigger endpoint (`/api/start-build`) that picks up approved ideas
- Build engine uses Claude Code CLI + GitHub CLI + Vercel CLI to create repos and deploy
- Supabase schema with real-time subscriptions (`dj_ideas`, `dj_builds`, `dj_preferences`, views for queue/active/ships)
- World Builder package generates characters with 8-layer psychology system
- World Builder MCP server exposes world-building tools to Claude
- Dark mode, responsive UI with real-time updates
- API endpoints for analyze, scaffold, ingest, and world build flows
- Status Brain workflow auto-generates this file on every push

## Recent changes (newest first)
- 2026-07-20 — Added Status Brain workflow and script to auto-generate this file on each push
- 2026-03-19 — Connected pipeline with Genesis analysis, scaffold, and ingest bridge
- 2026-01-27 — Added full task lifecycle rules and task tracking via tasks/ directory
- 2026-01-27 — Organized task files migrated from PRD
- 2026-01-18 — Added build queue visibility and management

## Reusable parts (for other projects)
- **World Builder** — Generates deeply layered characters using 8-layer psychology system — `packages/world-builder/`
- **World Builder MCP** — Exposes world generation as Claude-compatible MCP tools — `packages/world-builder-mcp/`
- **Supabase schema** — dj_-prefixed tables safe for shared projects — `supabase/migrations/`
- **shadcn/ui components** — Pre-built dashboard UI components (card, button, dialog, tabs, etc.) — `apps/dashboard/src/components/ui/`

## Not done / next
- Full end-to-end build test (PRD → actual working deployed project)
- "Modify PRD before approving" flow
- SMS/Slack notifications for pending approvals
- Cost tracking per build
- Cron job or webhook for automated build loop triggering
- Auto-approve rules based on learned patterns
- Chrome extension for capturing tweets directly
- World template input UI on dashboard
- World generation progress display on dashboard
- Relationship visualization for generated characters
- Bird client (Twitter) integration — defined but not wired
- Notifier (SMS/Slack) — defined but not wired
