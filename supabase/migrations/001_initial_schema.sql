-- DJ Loop Schema
-- Generalized idea-to-product pipeline
-- All tables prefixed with dj_ to avoid conflicts with other projects
-- Run this in Supabase SQL Editor

-- Enable UUID extension (safe to run multiple times)
create extension if not exists "uuid-ossp";

-- DJ Loop Ideas table
create table dj_ideas (
  id uuid primary key default uuid_generate_v4(),

  -- Input (flexible - any source)
  title text not null,
  raw_input text not null,
  input_type text not null default 'manual' check (
    input_type in ('manual', 'tweet', 'bug', 'feature', 'voice')
  ),
  source_url text default null,
  source_metadata jsonb default '{}',

  -- Generated PRD
  prd text default null,
  prd_approved boolean default false,

  -- Classification
  project_dna text default 'utility-app' check (
    project_dna in ('chrome-extension', 'adhd-game', 'utility-app', 'api', 'script')
  ),
  score int default 0,
  tags text[] default array[]::text[],

  -- Status tracking
  status text not null default 'draft' check (
    status in ('draft', 'generating_prd', 'pending_approval', 'approved', 'rejected', 'building', 'shipped', 'archived')
  ),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- DJ Loop Builds table
create table dj_builds (
  id uuid primary key default uuid_generate_v4(),
  idea_id uuid references dj_ideas(id) on delete cascade,

  status text not null default 'queued' check (
    status in ('queued', 'running', 'paused', 'completed', 'failed')
  ),
  progress int default 0 check (progress >= 0 and progress <= 100),
  current_phase text default null,
  phases jsonb default '[]',

  logs text[] default array[]::text[],
  error_message text default null,

  repo_url text default null,
  deployed_url text default null,
  pr_url text default null,

  cost_estimate decimal(10,2) default 0,
  actual_cost decimal(10,2) default 0,

  started_at timestamptz default null,
  completed_at timestamptz default null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- DJ Loop Preferences table
create table dj_preferences (
  id uuid primary key default uuid_generate_v4(),

  auto_approve_rules jsonb default '[]',
  auto_reject_rules jsonb default '[]',

  learned_patterns jsonb default '{
    "approves": [],
    "rejects": [],
    "confidence": 0
  }',

  notification_settings jsonb default '{
    "sms_enabled": false,
    "sms_number": null,
    "slack_enabled": false,
    "slack_webhook": null
  }',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- DJ Loop Views
create view dj_queue_stats as
select
  status,
  count(*) as count,
  max(created_at) as latest
from dj_ideas
group by status;

create view dj_pending_approval as
select * from dj_ideas
where status = 'pending_approval'
order by score desc, created_at asc;

create view dj_active_builds as
select
  b.*,
  i.title,
  i.project_dna
from dj_builds b
join dj_ideas i on b.idea_id = i.id
where b.status in ('queued', 'running')
order by b.created_at desc;

create view dj_recent_ships as
select
  b.*,
  i.title,
  i.project_dna
from dj_builds b
join dj_ideas i on b.idea_id = i.id
where b.status = 'completed'
order by b.completed_at desc
limit 10;

-- Updated_at trigger function (uses generic name, safe if exists)
create or replace function dj_update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger dj_ideas_updated_at
  before update on dj_ideas
  for each row execute function dj_update_updated_at();

create trigger dj_builds_updated_at
  before update on dj_builds
  for each row execute function dj_update_updated_at();

create trigger dj_preferences_updated_at
  before update on dj_preferences
  for each row execute function dj_update_updated_at();

-- Enable realtime for DJ Loop tables
alter publication supabase_realtime add table dj_ideas;
alter publication supabase_realtime add table dj_builds;

-- Default preferences row
insert into dj_preferences (id) values (uuid_generate_v4());

-- Indexes
create index idx_dj_ideas_status on dj_ideas(status);
create index idx_dj_ideas_created_at on dj_ideas(created_at desc);
create index idx_dj_builds_status on dj_builds(status);
create index idx_dj_builds_idea_id on dj_builds(idea_id);
