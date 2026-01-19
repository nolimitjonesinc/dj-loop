# DJ Loop - Quickstart

## Prerequisites

You should already have:
- [x] `bird` CLI installed (`npm install -g @steipete/bird`)
- [ ] Supabase account
- [ ] Twilio account (for SMS)
- [ ] Claude API key

## Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to SQL Editor
3. Copy contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run in SQL Editor
5. Copy your project URL and anon key from Settings > API

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in your keys:
- `NEXT_PUBLIC_SUPABASE_URL` - from Supabase dashboard
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - from Supabase dashboard
- `TWILIO_*` - from Twilio console (optional for SMS)
- `ANTHROPIC_API_KEY` - from Anthropic console

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Run Dashboard

```bash
pnpm dev
```

Open http://localhost:3000

## Testing Bird CLI

Make sure bird works:

```bash
# Check if authenticated
bird whoami

# Get your latest bookmark
bird bookmarks -n 1

# Read a specific tweet
bird read "https://x.com/someuser/status/123456"
```

## First Capture Test

Once dashboard is running:

1. Paste a tweet URL in the capture box
2. Watch it move through: Captured → Analyzing → Pending Approval
3. Check your phone for SMS (if configured)
4. Reply YES to approve
5. Watch the build start

## Folder Structure

```
dj-loop/
├── apps/
│   ├── dashboard/       # Next.js UI (run with pnpm dev)
│   └── chrome-extension/# Browser extension (future)
├── packages/
│   ├── analyzer/        # Idea analysis
│   ├── builder/         # Autonomous builder
│   ├── notifier/        # SMS/Slack
│   └── bird-client/     # Twitter fetching
├── supabase/
│   └── migrations/      # Database schema
└── docs/
    ├── PROJECT_BRIEF.md # Full spec
    └── QUICKSTART.md    # This file
```

## Next Steps

After basic setup works:

1. **Add Chrome Extension** - Right-click capture on any tweet
2. **Configure Slack** - Richer approval interface
3. **Set up autonomous builder** - Claude Agent SDK integration
4. **Add learning system** - Auto-approve based on patterns

## Troubleshooting

### Bird CLI not working

```bash
# Check if logged in
bird check

# If not authenticated, log into Twitter in your browser first
# Bird uses your browser cookies
```

### Supabase connection issues

- Check that your anon key is correct
- Make sure realtime is enabled for ideas/builds tables
- Check Row Level Security if you added any

### SMS not sending

- Verify Twilio credentials
- Check Twilio console for error logs
- Make sure phone number is in E.164 format (+1234567890)
