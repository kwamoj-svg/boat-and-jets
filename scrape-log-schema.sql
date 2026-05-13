-- ═══════════════════════════════════════════════════════════
-- VELIQA Scrape Log + Charter Boats Schema additions
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1) Scrape log (for monitoring hourly cron)
CREATE TABLE IF NOT EXISTS scrape_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  targets TEXT[],
  scraped INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  results JSONB
);

CREATE INDEX IF NOT EXISTS idx_scrape_log_created ON scrape_log(created_at DESC);

ALTER TABLE scrape_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only on scrape_log" ON scrape_log;
CREATE POLICY "Service role only on scrape_log" ON scrape_log
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 2) Add 'source' column to charter_boats and charter_companies (track origin)
ALTER TABLE charter_boats ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE charter_companies ADD COLUMN IF NOT EXISTS source TEXT;

-- 3) Allow public READ on charter_boats and charter_companies (for catalog/search)
-- (Already enabled, but ensure it's there)
ALTER TABLE charter_boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE charter_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read charter_boats" ON charter_boats;
CREATE POLICY "Public read charter_boats" ON charter_boats
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Public read charter_companies" ON charter_companies;
CREATE POLICY "Public read charter_companies" ON charter_companies
  FOR SELECT USING (true);

-- 4) Service role can write (for cron scraper)
DROP POLICY IF EXISTS "Service write charter_boats" ON charter_boats;
CREATE POLICY "Service write charter_boats" ON charter_boats
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service write charter_companies" ON charter_companies;
CREATE POLICY "Service write charter_companies" ON charter_companies
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 5) Helpful indexes for search
CREATE INDEX IF NOT EXISTS idx_boats_country_active ON charter_boats(country, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_boats_type_active ON charter_boats(boat_type, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_boats_price ON charter_boats(price_per_day) WHERE status = 'active' AND price_per_day IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_boats_base_port ON charter_boats(base_port) WHERE status = 'active';

-- 6) Text search vector (computed column) for fast search
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'charter_boats' AND column_name = 'search_vector') THEN
    ALTER TABLE charter_boats ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(brand, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(model, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(base_port, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(country, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(region, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(description, '')), 'D')
      ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_boats_search ON charter_boats USING GIN(search_vector);
