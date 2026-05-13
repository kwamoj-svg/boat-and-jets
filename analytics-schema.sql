-- ============================================================
-- VELIQA Analytics Tracking Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'page_view', 'search', 'boat_click', 'boat_save', 'boat_unsave',
    'charter_click', 'company_click', 'filter_use', 'destination_click',
    'contact_click', 'share_click', 'signup', 'login', 'outbound_link'
  )),
  -- What was interacted with
  entity_type TEXT,           -- 'boat', 'company', 'search', 'page', etc.
  entity_id   TEXT,           -- ID or slug of the entity
  entity_name TEXT,           -- Human-readable name for display

  -- Context
  page_url    TEXT,           -- Page where event occurred
  referrer    TEXT,           -- Where user came from
  search_query TEXT,          -- Search query if relevant

  -- Extra metadata (flexible JSON)
  metadata    JSONB DEFAULT '{}'::jsonb,

  -- User info
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  TEXT,           -- Anonymous session tracking

  -- Device info
  device_type TEXT CHECK (device_type IN ('desktop', 'tablet', 'mobile')),
  browser     TEXT,
  country     TEXT,

  -- Timestamps
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_ae_event_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_ae_entity ON analytics_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ae_created ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_user ON analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_ae_session ON analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_ae_page ON analytics_events (page_url);

-- Composite index for popular queries
CREATE INDEX IF NOT EXISTS idx_ae_boat_clicks ON analytics_events (entity_id, created_at DESC)
  WHERE event_type = 'boat_click';
CREATE INDEX IF NOT EXISTS idx_ae_searches ON analytics_events (search_query, created_at DESC)
  WHERE event_type = 'search';

-- Daily aggregated stats (materialized for performance)
CREATE TABLE IF NOT EXISTS analytics_daily (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date        DATE NOT NULL,
  event_type  TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  entity_name TEXT,
  count       INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  metadata    JSONB DEFAULT '{}'::jsonb,
  UNIQUE(date, event_type, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_date ON analytics_daily (date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_event ON analytics_daily (event_type, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_entity ON analytics_daily (entity_type, entity_id, date DESC);

-- RLS: Allow anonymous inserts but restrict reads to admins
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (tracking)
CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read their own events
CREATE POLICY "Users can read own events"
  ON analytics_events FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can read all (for admin API)
-- (Service role bypasses RLS by default)

-- Anyone can read daily aggregates
CREATE POLICY "Anyone can read daily analytics"
  ON analytics_daily FOR SELECT
  USING (true);

CREATE POLICY "Service can insert daily analytics"
  ON analytics_daily FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update daily analytics"
  ON analytics_daily FOR UPDATE
  USING (true);

-- Function to aggregate daily stats (run via cron or manually)
CREATE OR REPLACE FUNCTION aggregate_daily_analytics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO analytics_daily (date, event_type, entity_type, entity_id, entity_name, count, unique_users, unique_sessions)
  SELECT
    target_date,
    event_type,
    entity_type,
    entity_id,
    MAX(entity_name),
    COUNT(*),
    COUNT(DISTINCT user_id),
    COUNT(DISTINCT session_id)
  FROM analytics_events
  WHERE created_at >= target_date AND created_at < target_date + INTERVAL '1 day'
  GROUP BY event_type, entity_type, entity_id
  ON CONFLICT (date, event_type, entity_type, entity_id)
  DO UPDATE SET
    count = EXCLUDED.count,
    unique_users = EXCLUDED.unique_users,
    unique_sessions = EXCLUDED.unique_sessions,
    entity_name = COALESCE(EXCLUDED.entity_name, analytics_daily.entity_name);
END;
$$ LANGUAGE plpgsql;
