# PRD: Cloud Build Engine (SDK Version)

> **Status:** Draft - NOT YET APPROVED
> **Note:** This is SEPARATE from the local CLI build engine. Both will exist.

---

## Summary

A cloud-deployable build engine using Claude Agent SDK that can run on serverless infrastructure, enabling DJ Loop to scale beyond a single Mac.

---

## Problem

The current build engine uses Claude Code CLI, which:
- Only runs on DJ's local Mac
- Requires Mac to be on and running
- Can't handle multiple simultaneous builds
- Can't be deployed as a web service

---

## Solution

Build a **second** build engine option using Claude Agent SDK that:
- Runs as pure API calls (no CLI dependencies)
- Can deploy to Vercel/AWS/any cloud
- Handles parallel builds
- Tracks API costs per build

---

## What This Is NOT

- **NOT a replacement** for the local CLI engine
- Local engine stays for: free builds using Claude subscription, offline work, personal use
- SDK engine is for: cloud deployment, scaling, productization

---

## Architecture

```
DJ Loop Dashboard
       │
       ├── Local Build Engine (KEEP - uses Claude Code CLI)
       │   └── Runs on Mac, uses subscription, no API costs
       │
       └── Cloud Build Engine (NEW - uses Claude Agent SDK)
           └── Runs anywhere, API costs per build, scalable
```

---

## Tech Stack

- **Claude Agent SDK** (`@anthropic-ai/sdk`) for code generation
- **Vercel Functions** or **AWS Lambda** for serverless execution
- **Supabase** for job queue and state (same as current)
- **GitHub API** (not CLI) for repo creation
- **Vercel API** (not CLI) for deployment

---

## Features

### Core
- [ ] Agent SDK integration for code generation
- [ ] GitHub API for repo creation (no `gh` CLI)
- [ ] Vercel API for deployment (no `vercel` CLI)
- [ ] Streaming progress updates to Supabase
- [ ] Cost tracking per build (tokens used → dollars)

### Configuration
- [ ] Toggle in dashboard: "Build locally" vs "Build in cloud"
- [ ] API key management for SDK builds
- [ ] Cost limits / budget alerts

### Monitoring
- [ ] Token usage per build
- [ ] Cost per build
- [ ] Success/failure rates
- [ ] Build time metrics

---

## API Endpoint

```
POST /api/cloud-build
{
  "ideaId": "uuid",
  "useCloud": true
}
```

Separate from existing `/api/start-build` which stays for local CLI builds.

---

## Database Changes

Add to `dj_builds` table:
```sql
build_type text default 'local' check (build_type in ('local', 'cloud')),
tokens_used int default 0,
api_cost decimal(10,4) default 0
```

---

## Cost Model

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude Sonnet | $3 | $15 |
| Claude Opus | $15 | $75 |

Estimated per build: $0.10 - $2.00 depending on complexity

---

## Environment Variables (New)

```
ANTHROPIC_API_KEY=sk-ant-...     # For SDK builds
GITHUB_TOKEN=ghp_...             # For GitHub API
VERCEL_TOKEN=...                 # For Vercel API
```

---

## User Flow

1. User approves idea in dashboard
2. User sees toggle: "Build locally (free)" or "Build in cloud ($X est.)"
3. If cloud selected:
   - Shows estimated cost
   - Requires confirmation
   - Runs via Agent SDK
   - Tracks actual cost
4. If local selected:
   - Works exactly as today
   - Uses Mac + CLI + subscription

---

## Success Criteria

- [ ] Can deploy build engine to Vercel Functions
- [ ] Builds complete without any CLI tools
- [ ] Cost tracking accurate within 10%
- [ ] Build time comparable to CLI version
- [ ] Dashboard shows build type and cost

---

## Out of Scope (For Now)

- Replacing local CLI engine (keep both)
- Auto-selecting local vs cloud
- Cost optimization / model selection
- Multi-region deployment

---

## Estimated Effort

- Agent SDK integration: 4-6 hours
- GitHub API integration: 2-3 hours
- Vercel API integration: 2-3 hours
- Dashboard toggle + cost display: 2-3 hours
- Testing: 2-4 hours

**Total: 12-19 hours**

---

## Dependencies

- Anthropic API key with Agent SDK access
- GitHub personal access token with repo scope
- Vercel token with deployment scope

---

## Notes

This PRD was generated for future implementation. The local CLI build engine remains the primary/default option for DJ's personal use.
