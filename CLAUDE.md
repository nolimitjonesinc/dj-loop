# DJ-Loop

## Project Overview

Autonomous idea-to-product pipeline. Submit ideas, get AI evaluation, approve builds, track progress from concept to shipped product. Includes a Chrome extension for quick idea capture.

## Tech Stack

- **Monorepo:** pnpm workspaces
- **Dashboard:** Next.js (App Router) + Supabase
- **Chrome Extension:** Standalone extension in `apps/chrome-extension/`
- **Language:** TypeScript
- **Database:** Supabase (Postgres)

## Architecture

```
apps/
  dashboard/       # Next.js web dashboard
    src/app/
      page.tsx     # Main dashboard (ideas, builds, queue)
      api/         # API routes
  chrome-extension/ # Quick idea capture
scripts/
  seed.ts          # Database seeding
```

## Key Dashboard Components

- `IdeaInput` — Submit new ideas
- `DraftIdeas` — Ideas awaiting evaluation
- `PendingApprovals` — Evaluated ideas needing human approval
- `BuildQueue` — Approved builds waiting to start
- `ActiveBuilds` — Currently building
- `RecentShips` — Completed/shipped products

## Development Commands

```bash
pnpm install
pnpm dev           # Run dashboard dev server
pnpm build         # Build all packages
pnpm lint          # Lint all packages
pnpm db:migrate    # Push Supabase schema
pnpm db:seed       # Seed database
pnpm db:reset      # Reset database
```

## Task Tracking

**Tasks are tracked in the `tasks/` directory** — one file per section.
Each file has markdown checklists (`- [x]` done, `- [ ]` undone).
HQ (hq.nolimitjones.com) reads these files automatically.

**Before starting work:** Read the `tasks/` directory. Find the file matching your work area.

**When you COMPLETE a task:**
1. Open the relevant `tasks/*.md` file
2. Change the item from `- [ ]` to `- [x]`
3. Commit the task file update in the SAME commit as your code changes

**When you DISCOVER new work** (bugs, missing features, improvements):
1. Add a `- [ ]` item to the most relevant task file
2. If nothing fits, create `tasks/XX-name.md` with the next available number
3. Commit it with your code

**When a task needs to CHANGE** (wrong, outdated, needs splitting):
1. Don't delete — mark `- [x] (REMOVED — reason)` or `- [x] (SPLIT — see below)`
2. Add corrected tasks as new `- [ ]` items
3. Nothing should vanish without a trace

**Parallel Session Safety:**
- Only edit the task file relevant to YOUR current work
- Do NOT edit other task files you aren't working on

**Reference:** `PRD_SDK_BUILD_ENGINE.md` and `DJ_LOOP_V2_PLAN.md` for full context.

## Context From DJ

DJ already has these live:
- labs.nolimitjones.com (NoLimitLabs - analysis pipeline)
- tweetminer.nolimitjones.com (TweetMiner)
- mockingbirdnews.org (Mockingbird News)
- quiplee (Chrome extension for tweet replies)
- loomiverse (Interactive storytelling platform)

Build patterns should match his existing work. Reference these for style/approach.

## When Stuck

1. Keep it simple - DJ prefers minimal over feature-rich
2. Ship working > ship perfect
3. If a decision needs taste, ask DJ
4. If a decision is mechanical, just pick and move

## Communication Style

- Direct, no fluff
- Show don't tell
- Deadpan humor appreciated
- "That's horrible" means iterate, not stop

## Notes

- Uses pnpm (not npm) — requires pnpm >= 8.0.0
- Node >= 18.0.0
- This is the pipeline that Ralph Wiggum will eventually automate
