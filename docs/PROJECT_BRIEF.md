# DJ Loop - Project Brief

## What This Is

DJ Loop is an autonomous idea-to-product pipeline. It captures ideas from Twitter, analyzes them, gets human approval, then builds and deploys working prototypes without human intervention.

## The Problem We're Solving

DJ (the user) is a creative director who spots 10+ good ideas daily but has limited time to build them. Ideas get lost. Opportunities pass. The bottleneck is execution, not vision.

## Core Flow

```
CAPTURE → ANALYZE → APPROVE → BUILD → DEPLOY
```

1. **Capture**: Right-click tweet or paste URL. System grabs tweet + all replies using `bird` CLI (already installed)
2. **Analyze**: Extract best ideas from comments, run through analysis pipeline (Exploit/Explain/Productize), generate PRD
3. **Approve**: Send SMS/Slack summary to DJ. Wait for approve/modify/kill
4. **Build**: Generate Claude Agent SDK script from PRD, run autonomously until complete
5. **Deploy**: Push to GitHub, deploy to Vercel, notify DJ with live link

## Key Requirements

- **Parallel processing**: Multiple ideas at different stages simultaneously
- **Queue-based**: Each stage runs independently
- **Minimal DJ involvement**: Only approval decisions, everything else automated
- **Learning system**: Track approvals/rejections, eventually auto-approve obvious wins
- **Dashboard UI**: Visual command center showing all queues, active builds, shipped products

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Dashboard | Next.js + shadcn/ui + Tailwind | DJ's stack, fast, pretty |
| Database | Supabase | Real-time updates, easy auth |
| Queue | Supabase + edge functions | Simple, scales |
| Capture | Chrome extension + bird CLI | Already works |
| Analysis | NoLimitLabs agents | Already built |
| Build engine | Claude Agent SDK | Official, stable |
| Orchestration | BullMQ or simple cron | Handles parallel jobs |
| Notifications | Twilio + Slack | Redundant, reliable |
| Deployment | Vercel CLI + GitHub CLI | Automated |

## Project DNA Templates

The system should support multiple project types with preset configurations:

### Chrome Extension
- Manifest v3
- Minimal permissions
- Works on X/Twitter

### ADHD Game
- Next.js + Tailwind
- Sound effects required
- No tutorial screens (learn by doing)
- Satisfying micro-interactions
- Mobile-first

### Utility App
- React + shadcn/ui
- Auth: Clerk or none
- Database: Supabase if needed

## User Context

DJ is a non-coder who directs AI to build things ("vibe coder"). Outputs should be:
- Clean, minimal UI
- No unnecessary complexity
- Mobile-friendly
- Ready to ship, not prototypes

## Success Criteria

- DJ can capture an idea in <5 seconds
- Analysis completes in <5 minutes
- Approval can happen from phone
- Build runs completely autonomously
- Deployed product works without manual fixes

## Phase 1 Deliverables

1. Dashboard shell with queue visualization
2. Supabase schema for ideas, queues, preferences
3. Bird CLI integration for tweet + reply extraction
4. Basic approval notification (SMS or Slack)
5. Single-project build pipeline (prove end-to-end works)

## File Structure

```
dj-loop/
├── apps/
│   ├── dashboard/          # Next.js command center
│   └── chrome-extension/   # Capture tool
├── packages/
│   ├── analyzer/           # Idea analysis pipeline
│   ├── builder/            # Agent SDK script generator
│   ├── notifier/           # Twilio/Slack integration
│   └── bird-client/        # Bird CLI wrapper
├── supabase/
│   └── migrations/         # Database schema
└── docs/
    └── architecture.md     # This document
```

## Immediate First Task

Set up the Supabase schema and dashboard shell. We need:
- `ideas` table (id, source_url, content, replies, status, created_at)
- `builds` table (id, idea_id, status, progress, logs, deployed_url)
- `preferences` table (user patterns, auto-approve rules)
- Basic Next.js dashboard showing queue counts

## Reference

DJ already has:
- NoLimitLabs (labs.nolimitjones.com) - analysis pipeline exists
- TweetMiner - tweet analysis tool exists
- Bird CLI installed globally

Build on these, don't recreate.

## Start Here

Show me the Supabase schema design first before implementing.
