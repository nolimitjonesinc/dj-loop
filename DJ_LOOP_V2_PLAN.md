# DJ Loop v2: Autonomous Build System

## Vision

A better version of agent-loop that:
- Runs locally (no API costs - uses Claude subscription)
- Has a visual dashboard (not just CLI/GitHub issues)
- Actually loops until success (not just tries once)
- Gives real-time feedback (not "refresh to see if it worked")
- Is designed for non-coders (DJ's use case)

---

## Goals

### Must Have (v2.0)
1. ✅ Retry loop - tries up to 3x with error analysis between attempts
2. ⬜ Real-time progress - dashboard updates live without refresh
3. ⬜ Clear status indicators - know instantly if something failed
4. ⬜ One-click error reporting - copy full context to paste into Claude

### Should Have (v2.1)
5. ⬜ Build queue - multiple ideas can be approved, builds run sequentially
6. ⬜ Notifications - SMS/Slack when build completes or needs attention
7. ⬜ Cost tracking - know how much each build uses (for future cloud version)

### Nice to Have (v2.2)
8. ⬜ Auto-fix common issues - don't even count as retry attempts
9. ⬜ Build templates - learn from successful builds
10. ⬜ Parallel builds - run multiple builds simultaneously

---

## Current Status

### ✅ Done
- Dashboard UI with idea input
- PRD generation from ideas
- Approval flow (approve/reject)
- Build engine with Claude Code CLI
- GitHub repo creation (Nolimit-Labs-Projects org)
- Vercel deployment
- Retry loop (3 attempts with error analysis)
- Error capture with stderr/stdout
- Collapsible build history
- Copy report for Claude button
- Failed build alerts

### ⬜ Not Done
- Real-time Supabase subscriptions not updating UI properly
- Build queue not implemented
- Notifications not implemented
- World-builder verification needs work

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DJ Loop Dashboard                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Idea Input  │  │  Approvals  │  │   Active Builds     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Build Engine (API)                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   RETRY LOOP                          │   │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐          │   │
│  │  │Attempt 1│ -> │Attempt 2│ -> │Attempt 3│ -> FAIL  │   │
│  │  └────┬────┘    └────┬────┘    └────┬────┘          │   │
│  │       │              │              │                │   │
│  │    SUCCESS?       SUCCESS?       SUCCESS?            │   │
│  │       │              │              │                │   │
│  │       ▼              ▼              ▼                │   │
│  │    ✅ DONE        ✅ DONE        ✅ DONE             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Outputs                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ GitHub Repo │  │Vercel Deploy│  │   Supabase Data     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Task List (Priority Order)

### Phase 1: Make It Actually Work (TODAY)
1. ⬜ Test the retry loop end-to-end with a real idea
2. ⬜ Fix real-time updates (Supabase subscriptions)
3. ⬜ Add build queue (process approved ideas automatically)
4. ⬜ Show attempt number in Active Builds UI

### Phase 2: Reliability
5. ⬜ Add timeout handling (kill stuck builds after 15 min)
6. ⬜ Add health check endpoint
7. ⬜ Better error categorization

### Phase 3: Notifications
8. ⬜ SMS notification when build completes
9. ⬜ SMS notification when build fails after all retries
10. ⬜ Slack webhook option

### Phase 4: Polish
11. ⬜ Mobile-friendly dashboard
12. ⬜ Dark mode improvements
13. ⬜ Build analytics (success rate, avg time)

---

## Comparison: agent-loop vs DJ Loop

| Feature | agent-loop | DJ Loop v2 |
|---------|-----------|------------|
| Interface | GitHub Issues | Visual Dashboard |
| Trigger | Issue created | Idea approved |
| Retry | Manual re-run | Automatic 3x |
| Error handling | None | Auto-analysis + fix prompts |
| Progress | Log file | Real-time UI |
| Cost | API costs | Free (Claude subscription) |
| User type | Developers | Non-coders |
| Notifications | None | SMS + Slack |
| Deploy | Manual | Auto Vercel |

---

## Success Metrics

1. **Build Success Rate** - Target: 80%+ on first attempt, 95%+ after retries
2. **Time to Ship** - Target: <10 min for utility apps
3. **DJ Involvement** - Target: Only approve/reject, nothing else
4. **Error Recovery** - Target: 50%+ of failures auto-fixed on retry

---

## Next Actions

Starting now with Phase 1, Task 1: Test the retry loop end-to-end.
