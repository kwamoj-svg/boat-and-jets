-- =============================================
-- VELIQA — Verified Global Yacht Network
-- Structured intelligence for luxury charter
-- =============================================

-- Drop if recreating (be careful in production)
-- DROP TABLE IF EXISTS yacht_network CASCADE;

CREATE TABLE IF NOT EXISTS yacht_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company Identity
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  city TEXT,
  marina TEXT,

  -- Contact
  website TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,

  -- Social
  instagram TEXT,
  facebook TEXT,
  youtube TEXT,
  linkedin TEXT,

  -- Services (array of categories)
  categories TEXT[] NOT NULL DEFAULT '{}',

  -- Intelligence Scores
  luxury_score INTEGER NOT NULL DEFAULT 5 CHECK (luxury_score BETWEEN 1 AND 10),
  ai_quality_score NUMERIC(3,1) NOT NULL DEFAULT 5.0 CHECK (ai_quality_score BETWEEN 1.0 AND 10.0),
  price_level TEXT NOT NULL DEFAULT '$$$' CHECK (price_level IN ('$', '$$', '$$$', '$$$$', '$$$$$')),
  response_time TEXT DEFAULT 'unknown' CHECK (response_time IN ('instant', 'within_1h', 'within_24h', 'slow', 'unknown')),

  -- Metadata
  languages TEXT[] DEFAULT '{en}',
  vip_friendly BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  fleet_size INTEGER,
  year_founded INTEGER,
  description TEXT,

  -- Operational
  operating_regions TEXT[] DEFAULT '{}',
  peak_season TEXT,
  booking_url TEXT,

  -- Images
  logo_url TEXT,
  cover_image_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,

  -- Search optimization
  search_vector TSVECTOR
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_yn_region ON yacht_network(region);
CREATE INDEX IF NOT EXISTS idx_yn_country ON yacht_network(country);
CREATE INDEX IF NOT EXISTS idx_yn_luxury ON yacht_network(luxury_score DESC);
CREATE INDEX IF NOT EXISTS idx_yn_ai_score ON yacht_network(ai_quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_yn_verified ON yacht_network(verified);
CREATE INDEX IF NOT EXISTS idx_yn_categories ON yacht_network USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_yn_operating_regions ON yacht_network USING GIN(operating_regions);
CREATE INDEX IF NOT EXISTS idx_yn_search ON yacht_network USING GIN(search_vector);

-- Auto-update search vector for full-text search
CREATE OR REPLACE FUNCTION update_yacht_network_search()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.company_name, '') || ' ' ||
    COALESCE(NEW.country, '') || ' ' ||
    COALESCE(NEW.region, '') || ' ' ||
    COALESCE(NEW.city, '') || ' ' ||
    COALESCE(NEW.marina, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(array_to_string(NEW.categories, ' '), '') || ' ' ||
    COALESCE(array_to_string(NEW.operating_regions, ' '), '')
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_yacht_network_search ON yacht_network;
CREATE TRIGGER trg_yacht_network_search
  BEFORE INSERT OR UPDATE ON yacht_network
  FOR EACH ROW EXECUTE FUNCTION update_yacht_network_search();

-- RLS
ALTER TABLE yacht_network ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_yacht_network" ON yacht_network FOR SELECT USING (true);
CREATE POLICY "service_write_yacht_network" ON yacht_network FOR INSERT WITH CHECK (true);
CREATE POLICY "service_update_yacht_network" ON yacht_network FOR UPDATE USING (true);
