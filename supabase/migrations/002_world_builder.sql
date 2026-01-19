-- ============================================
-- WORLD BUILDER TABLES
-- Stores world templates and generated characters
-- ============================================

-- World Templates
CREATE TABLE IF NOT EXISTS dj_worlds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,

  -- Core settings
  era TEXT NOT NULL,
  tech_level TEXT,
  setting_type TEXT DEFAULT 'city',

  -- Structure (stored as JSONB)
  neighborhoods JSONB DEFAULT '[]',
  factions JSONB DEFAULT '[]',
  social_classes JSONB DEFAULT '[]',
  key_events JSONB DEFAULT '[]',
  cultural_groups JSONB DEFAULT '[]',
  dominant_values JSONB DEFAULT '[]',

  -- Generation settings
  character_count INTEGER DEFAULT 20,
  relationship_density TEXT DEFAULT 'normal',

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'generating', 'completed', 'failed')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- World Generation Jobs
CREATE TABLE IF NOT EXISTS dj_world_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id UUID REFERENCES dj_worlds(id) ON DELETE CASCADE,

  -- Progress tracking
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'paused', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  current_phase TEXT,
  characters_generated INTEGER DEFAULT 0,
  characters_total INTEGER,
  current_character TEXT,

  -- Logs and errors
  logs TEXT[] DEFAULT '{}',
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Characters
CREATE TABLE IF NOT EXISTS dj_world_characters (
  id TEXT PRIMARY KEY,
  world_id UUID REFERENCES dj_worlds(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,

  -- World placement
  neighborhood TEXT,
  faction TEXT,
  social_class TEXT,
  profession TEXT,

  -- Psychology (the 8 layers)
  psychology JSONB,

  -- Life simulation
  life_events JSONB DEFAULT '[]',
  core_memories JSONB DEFAULT '[]',

  -- AI elaborations
  elaborations JSONB,

  -- Relationships
  relationships JSONB DEFAULT '[]',

  -- Status
  generation_phase TEXT DEFAULT 'seed',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dj_worlds_status ON dj_worlds(status);
CREATE INDEX IF NOT EXISTS idx_dj_world_jobs_world_id ON dj_world_jobs(world_id);
CREATE INDEX IF NOT EXISTS idx_dj_world_jobs_status ON dj_world_jobs(status);
CREATE INDEX IF NOT EXISTS idx_dj_world_characters_world_id ON dj_world_characters(world_id);

-- Enable realtime for progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE dj_world_jobs;

-- View: Active world generation jobs
CREATE OR REPLACE VIEW dj_active_world_jobs AS
SELECT
  j.id,
  j.world_id,
  w.name AS world_name,
  j.status,
  j.progress,
  j.current_phase,
  j.characters_generated,
  j.characters_total,
  j.current_character,
  j.started_at
FROM dj_world_jobs j
JOIN dj_worlds w ON j.world_id = w.id
WHERE j.status IN ('queued', 'running')
ORDER BY j.created_at DESC;

-- View: Recent world completions
CREATE OR REPLACE VIEW dj_recent_worlds AS
SELECT
  w.id,
  w.name,
  w.era,
  w.character_count,
  w.status,
  w.created_at,
  j.completed_at,
  (
    SELECT COUNT(*) FROM dj_world_characters c WHERE c.world_id = w.id
  ) AS actual_character_count
FROM dj_worlds w
LEFT JOIN dj_world_jobs j ON w.id = j.world_id AND j.status = 'completed'
WHERE w.status = 'completed'
ORDER BY j.completed_at DESC
LIMIT 10;
