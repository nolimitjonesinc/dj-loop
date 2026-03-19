# Core Features

> Source: `created by setup script`
> Progress: 1/8 tasks done

## Tasks

- [x] Add scaffold agent — bridge between approve and build (generates CLAUDE.md + phased task list)
- [ ] Run migration 004_scaffold_columns.sql in Supabase
- [ ] Test scaffold flow end-to-end (approve idea → scaffold → review plan → start build)
- [ ] Test full build flow with scaffold CLAUDE.md (does it produce better output?)
- [ ] Wire SMS/Slack notifications to dashboard events
- [ ] Chrome extension for idea capture
- [ ] End-to-end test: idea → PRD → scaffold → build → deploy
- [x] Connect to Genesis Engine (ideas from labs.nolimitjones.com flow in automatically)
- [ ] Add GENESIS_URL to production environment variables on Vercel
- [ ] Test Genesis analysis end-to-end (submit idea via ingest → verify 9-agent analysis populates)
