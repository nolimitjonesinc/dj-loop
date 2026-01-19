-- ============================================
-- VERIFICATION SYSTEM SCHEMA UPDATES
-- Adds build tracking and human-readable reports
-- ============================================

-- ===========================================
-- 1. WORLD BUILDER CHARACTER TRACKING
-- ===========================================

-- Add build_id column to track which build created each character
ALTER TABLE dj_world_characters
ADD COLUMN IF NOT EXISTS build_id UUID REFERENCES dj_builds(id) ON DELETE SET NULL;

-- Add narrative_role for story function
ALTER TABLE dj_world_characters
ADD COLUMN IF NOT EXISTS narrative_role TEXT;

-- Add markdown_summary for human-readable version
ALTER TABLE dj_world_characters
ADD COLUMN IF NOT EXISTS markdown_summary TEXT;

-- Index for efficient lookups by build
CREATE INDEX IF NOT EXISTS idx_dj_world_characters_build_id ON dj_world_characters(build_id);

-- ===========================================
-- 2. BUILD REPORT STORAGE
-- ===========================================

-- Add build_report column to store verification results and human-readable reports
-- This JSONB column stores the complete BuildReport object
ALTER TABLE dj_builds
ADD COLUMN IF NOT EXISTS build_report JSONB;

-- ===========================================
-- 3. VIEWS FOR REPORTING
-- ===========================================

-- View: Character counts per build (for verification)
CREATE OR REPLACE VIEW dj_build_character_counts AS
SELECT
  b.id AS build_id,
  i.title AS idea_title,
  b.status AS build_status,
  COUNT(c.id) AS character_count,
  b.completed_at
FROM dj_builds b
LEFT JOIN dj_ideas i ON b.idea_id = i.id
LEFT JOIN dj_world_characters c ON c.build_id = b.id
WHERE i.project_dna = 'world-builder'
GROUP BY b.id, i.title, b.status, b.completed_at
ORDER BY b.completed_at DESC;

-- View: Build reports summary (for dashboard)
CREATE OR REPLACE VIEW dj_build_reports AS
SELECT
  b.id,
  i.title,
  i.project_dna,
  b.status,
  b.build_report->>'success' AS verified_success,
  b.build_report->'summary'->>'headline' AS headline,
  b.build_report->'summary'->>'explanation' AS explanation,
  b.build_report->'summary'->>'location' AS location,
  b.repo_url,
  b.deployed_url,
  b.completed_at
FROM dj_builds b
LEFT JOIN dj_ideas i ON b.idea_id = i.id
WHERE b.status IN ('completed', 'failed')
ORDER BY b.completed_at DESC;
