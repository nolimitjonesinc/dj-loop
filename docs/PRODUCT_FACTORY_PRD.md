# DJ Loop: Autonomous Product Factory

> Turn internet problems into shipped products while you sleep.

---

## The Vision

An autonomous pipeline that scans the internet for problems, generates product ideas, evaluates them, builds them, and ships them — with Danny only stepping in for taste decisions.

## What Exists Today

| Tool | What It Does | Status |
|------|-------------|--------|
| **TweetMiner** | Scans Twitter/Reddit/LinkedIn/HN/YouTube for opportunities | Shipped, standalone |
| **Genesis Engine** | 9-agent deep analysis of ideas (PRD, research, task board) | Shipped at genesis.nolimitjones.com |
| **DJ Loop Dashboard** | Idea queue, PRD generation, scaffold agent | ~40% built, running locally |

**The problem:** These three tools don't talk to each other. Ideas die in browser tabs.

---

## The Pipeline

```
SCAN → CAPTURE → EVALUATE → INTERVIEW → SCAFFOLD → BUILD → DEPLOY → SELL
```

### Stage 1: SCAN (TweetMiner)
Agents crawl social platforms for complaints, pain points, and feature requests.
- **Today:** Manual — you browse and right-click
- **Future:** Automated scanning on schedule, auto-feeding ideas into the pipeline

### Stage 2: CAPTURE (Genesis Engine + DJ Loop)
Raw signals become structured ideas in the database.
- **Today:** Genesis Engine analyzes ideas but they don't flow to DJ Loop. DJ Loop accepts manual input only.
- **Future:** TweetMiner "Productize" output auto-creates ideas in DJ Loop. Genesis Engine deep analysis feeds the same queue.

### Stage 3: EVALUATE (New — AI Scoring Agent)
AI rates each idea before Danny sees it. Kills obvious losers, flags obvious winners.
- **Criteria:** Market size, competition level, build complexity, revenue potential, fit with Danny's stack/preferences
- **Output:** Score (1-10) + recommendation (build/skip/needs-more-info)
- **Cost:** ~$0.01 per idea (Haiku)

### Stage 4: INTERVIEW (New — Clarification Agent)
For ideas that pass evaluation, a chat agent asks Danny 3-5 targeted questions to sharpen the spec.
- "Who's the user?" / "What's the one thing it MUST do?" / "How do they find it?"
- Feeds answers into the PRD for a much better build spec
- **Cost:** ~$0.05 per interview (Sonnet, multi-turn)

### Stage 5: SCAFFOLD (Exists — Needs Polish)
Generates CLAUDE.md + task list + repo structure for the build agent.
- **Today:** Works via API, 2 Sonnet calls (~$0.04)
- **Future:** Auto-creates GitHub repo, commits scaffold files, sets up Vercel project

### Stage 6: BUILD (Partially Exists — Needs Build Agent)
Autonomous coding agent executes the scaffold task list.
- **Today:** Endpoint exists but no actual build agent
- **Future:** Claude Agent SDK or Claude Code CLI executes tasks, commits code, opens PRs

### Stage 7: DEPLOY (Not Built)
Auto-deploy to Vercel, set up custom domain, smoke test.
- Vercel CLI + GitHub integration
- Basic smoke test (does it load? does it error?)

### Stage 8: SELL (Future)
Landing page generation, marketplace listing, analytics.
- Way down the road. Build the factory first.

---

## What Makes This Different

This is NOT another AI coding tool. Claude Code already writes code.

**DJ Loop is a product FACTORY.** The differentiators:
- **Idea sourcing at scale** — scanning the internet, not waiting for inspiration
- **Danny's taste baked in** — every build starts with his stack, his style, his constraints
- **Queue-based** — dump 10 ideas, walk away, come back to shipped products
- **Pipeline memory** — learns what works, what fails, what Danny approves
- **End-to-end** — from internet complaint to deployed product, not just "write code"

---

## Cost Per Idea (Estimated)

| Stage | Model | Cost |
|-------|-------|------|
| Scan | Free (browsing) / Haiku (auto-scan) | $0.00-0.01 |
| Evaluate | Haiku | ~$0.01 |
| Interview | Sonnet (3-5 turns) | ~$0.05 |
| PRD Generation | Sonnet | ~$0.02 |
| Scaffold | Sonnet (2 calls) | ~$0.04 |
| Build | Sonnet/Opus (heavy) | $0.50-5.00 |
| Deploy | Free (Vercel) | $0.00 |
| **Total per idea** | | **~$0.60-5.15** |

The build step is 95%+ of the cost. Everything else is pocket change.

---

## Tech Decisions

- **Stack:** Next.js + Tailwind + shadcn/ui + Supabase + Vercel (Danny's default)
- **AI:** Anthropic Claude API (Haiku for cheap stuff, Sonnet for quality, Opus for complex reasoning)
- **Monorepo:** pnpm workspaces (dashboard + chrome extension + packages)
- **Realtime:** Supabase subscriptions for live dashboard updates
- **Notifications:** Twilio SMS when ideas need approval (future: Slack)

---

## Known Gaps

1. **Schema mismatch:** DJ Loop uses `dj_ideas` tables, Genesis Engine uses `ideas` tables. Need to reconcile.
2. **Genesis Engine code isn't local.** Danny may need to clone it or we build the bridge from DJ Loop's side.
3. **No build agent exists.** The scaffold creates a plan but nothing executes it yet.
4. **TweetMiner is fully standalone.** No API endpoint to push ideas to DJ Loop.

---

*Generated 2026-03-10 by DJ Loop planning session*
