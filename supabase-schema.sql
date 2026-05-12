-- =============================================
-- BOAT Database Schema for Supabase
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Search cache — stores full search results for 6 hours
CREATE TABLE IF NOT EXISTS search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT UNIQUE NOT NULL,
  query_text TEXT NOT NULL,
  parsed_query JSONB,
  results JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '6 hours'
);

CREATE INDEX IF NOT EXISTS idx_search_cache_hash ON search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON search_cache(expires_at);

-- 2. Boat registry — individual boats with verified detail URLs
CREATE TABLE IF NOT EXISTS boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  brand TEXT,
  model TEXT,
  year INTEGER,
  length_ft INTEGER,
  cabins INTEGER,
  guests INTEGER,
  crew INTEGER,
  price_per_day NUMERIC,
  price_per_week NUMERIC,
  sale_price NUMERIC,
  currency TEXT DEFAULT 'EUR',
  region TEXT,
  country TEXT,
  port TEXT,
  detail_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  image_url TEXT,
  features JSONB DEFAULT '[]',
  description TEXT,
  luxury_level INTEGER DEFAULT 3,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one boat per name per domain
  UNIQUE(name, source_domain)
);

CREATE INDEX IF NOT EXISTS idx_boats_country ON boats(country);
CREATE INDEX IF NOT EXISTS idx_boats_type ON boats(type);
CREATE INDEX IF NOT EXISTS idx_boats_domain ON boats(source_domain);
CREATE INDEX IF NOT EXISTS idx_boats_guests ON boats(guests);
CREATE INDEX IF NOT EXISTS idx_boats_price ON boats(price_per_day);
CREATE INDEX IF NOT EXISTS idx_boats_updated ON boats(updated_at DESC);

-- 3. Enable Row Level Security (RLS) but allow anon access for our app
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;

-- Allow anon key to read/write (our server-side app uses anon key)
CREATE POLICY "Allow anon read search_cache" ON search_cache FOR SELECT USING (true);
CREATE POLICY "Allow anon insert search_cache" ON search_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update search_cache" ON search_cache FOR UPDATE USING (true);

CREATE POLICY "Allow anon read boats" ON boats FOR SELECT USING (true);
CREATE POLICY "Allow anon insert boats" ON boats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update boats" ON boats FOR UPDATE USING (true);

-- 4. Auto-cleanup: delete expired search cache (run periodically)
-- You can set up a Supabase cron job or just let old entries sit
-- DELETE FROM search_cache WHERE expires_at < NOW();
