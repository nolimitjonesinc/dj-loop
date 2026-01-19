# DJ Loop

## What Is This?

DJ Loop is an autonomous idea-to-product pipeline. Capture tweets → analyze → approve → build → deploy. All automated except approval decisions.

## The User

DJ is a non-coder creative director. He spots ideas, approves/rejects, and reviews shipped products. Everything else should be automated.

## Core Principle

**DJ's time is the bottleneck.** Every design decision should minimize his involvement. If something can be automated, automate it. If something needs his taste, make the decision surface as small as possible (approve/modify/kill, not paragraphs of options).

## Architecture

```
CAPTURE → ANALYZE → APPROVE → BUILD → DEPLOY
   ↓         ↓         ↓         ↓        ↓
 Queue     Queue    (human)   Queue    Queue
```

Each stage runs independently. Multiple ideas flow through simultaneously.

## Tech Stack

- **Dashboard**: Next.js 14 + shadcn/ui + Tailwind
- **Database**: Supabase (queues, ideas, preferences)
- **Capture**: Chrome extension + bird CLI
- **Analysis**: Claude API (reuse NoLimitLabs patterns)
- **Build Engine**: Claude Agent SDK
- **Notifications**: Twilio SMS + Slack
- **Deploy**: Vercel CLI + GitHub CLI

## Key Files

```
apps/dashboard/          → Next.js command center UI
apps/chrome-extension/   → Tweet capture tool
packages/analyzer/       → Idea analysis pipeline
packages/builder/        → PRD → SDK script generator
packages/notifier/       → SMS/Slack notifications
packages/bird-client/    → Bird CLI wrapper
supabase/migrations/     → Database schema
```

## Database Schema

### ideas
- id (uuid)
- source_url (text)
- source_content (jsonb) - tweet + replies
- analysis (jsonb) - exploit/explain/productize results
- prd (text) - generated PRD
- status (enum: captured, analyzing, pending_approval, approved, rejected, building, shipped, archived)
- project_dna (text) - template type
- score (int) - auto-calculated priority
- created_at, updated_at

### builds
- id (uuid)
- idea_id (fk)
- status (enum: queued, running, paused, completed, failed)
- progress (int 0-100)
- current_phase (text)
- logs (text[])
- repo_url (text)
- deployed_url (text)
- cost_estimate (decimal)
- actual_cost (decimal)
- started_at, completed_at

### preferences
- id (uuid)
- auto_approve_rules (jsonb)
- auto_reject_rules (jsonb)
- learned_patterns (jsonb)
- notification_settings (jsonb)

## Project DNA Templates

When building, match these patterns:

### chrome-extension
- Manifest v3
- Minimal permissions
- Clean popup UI
- Works on twitter.com / x.com

### adhd-game
- Next.js + Tailwind
- Sound effects (Howler.js)
- No tutorial screens
- Satisfying micro-interactions
- Mobile-first

### utility-app
- Next.js + shadcn/ui
- Supabase if auth/data needed
- Dark mode default
- Vercel deploy

## Design Principles

1. **Minimal UI** - No clutter, no unnecessary elements
2. **Mobile-friendly** - Approvals happen from phone
3. **Real-time** - Dashboard updates live via Supabase subscriptions
4. **Forgiving** - Undo/archive, never permanent delete
5. **Fast** - Capture in <5s, analysis in <5min

## External Dependencies

- `bird` CLI is installed globally (Twitter/X access)
- Supabase project needs to be created
- Twilio account for SMS
- Vercel account for deploys
- GitHub account for repos

## Commands

```bash
# Development
pnpm dev              # Run dashboard locally
pnpm db:migrate       # Run Supabase migrations
pnpm db:seed          # Seed test data

# Production
pnpm build            # Build all packages
pnpm deploy           # Deploy dashboard to Vercel
```

## Current Status

Phase 1: Foundation
- [ ] Supabase schema
- [ ] Dashboard shell with queue visualization
- [ ] Bird CLI integration
- [ ] Basic capture flow
- [ ] Approval notifications

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
