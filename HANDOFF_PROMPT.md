# Handoff Prompt for Claude Code

Copy and paste this entire file into Claude Code to get started.

---

## Context

I'm building DJ Loop - an autonomous idea-to-product pipeline. The project structure and documentation already exists. Your job is to build the dashboard and make the pipeline work end-to-end.

Read the CLAUDE.md file first - it has all the context you need.

## What's Already Done

- Folder structure created
- Database schema written (needs to be run in Supabase)
- Bird CLI client wrapper written
- Notifier package (Twilio/Slack) written
- Documentation complete

## What Needs to Be Built

### Phase 1: Dashboard Shell (START HERE)

Build the Next.js dashboard at `apps/dashboard/`:

1. **Setup**
   - Next.js 14 with App Router
   - shadcn/ui components
   - Tailwind CSS
   - Supabase client

2. **Pages**
   - `/` - Main dashboard showing:
     - Queue counts (captured, analyzing, pending, building, shipped)
     - Active builds with progress bars
     - Recent ships with links
     - Pending approvals (cards with approve/modify/kill buttons)
   - `/ideas` - List all ideas with status filters
   - `/builds` - Build history and logs
   - `/settings` - Notification preferences

3. **Components**
   - QueueStats - Shows counts for each pipeline stage
   - IdeaCard - Shows idea with approve/modify/kill actions
   - BuildProgress - Progress bar with phase info
   - CaptureInput - Paste tweet URL to capture

4. **Real-time**
   - Subscribe to Supabase realtime for ideas/builds tables
   - Dashboard updates automatically

### Design Requirements

- Dark mode by default
- Minimal, no clutter
- Mobile-responsive (DJ approves from phone)
- No emojis except for status indicators

## Tech Decisions (Already Made)

- Next.js 14 + App Router
- shadcn/ui + Tailwind
- Supabase for database + realtime
- pnpm for package management

## Commands

```bash
# From project root
cd apps/dashboard
pnpm create next-app . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
pnpm add @supabase/supabase-js
pnpm dlx shadcn-ui@latest init
```

## Start Here

1. Read CLAUDE.md for full context
2. Set up the Next.js app in apps/dashboard/
3. Create the main dashboard page with queue stats
4. Add Supabase connection
5. Add capture input that creates new idea in database
6. Show me when basic dashboard is working

## Reference

DJ's style (from his other projects):
- Clean, minimal UI
- Functional over decorative
- Dark backgrounds, subtle borders
- Sans-serif fonts

---

END OF HANDOFF PROMPT
