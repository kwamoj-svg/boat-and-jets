-- ═══════════════════════════════════════════════════════════
-- VELIQA — Storage bucket + Sale boats schema
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1) STORAGE BUCKET for boat images
-- ─────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'boat-images',
  'boat-images',
  true,            -- public read
  8388608,         -- 8 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "Auth users can upload boat images" ON storage.objects;
CREATE POLICY "Auth users can upload boat images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'boat-images');

DROP POLICY IF EXISTS "Auth users can update own boat images" ON storage.objects;
CREATE POLICY "Auth users can update own boat images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'boat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Auth users can delete own boat images" ON storage.objects;
CREATE POLICY "Auth users can delete own boat images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'boat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Public read boat images" ON storage.objects;
CREATE POLICY "Public read boat images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'boat-images');

-- ─────────────────────────────────────────────
-- 2) SALE BOATS table (for future use — listing boats for sale)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sale_boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Seller (can be partner_id OR user_id, depending on source)
  partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'partner', -- 'partner' | 'auto_scrape' | 'manual'

  -- Boat identity
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  boat_type TEXT NOT NULL
    CHECK (boat_type IN ('sailboat','catamaran','motorboat','yacht','gulet','speedboat','jet_ski','houseboat','superyacht')),
  brand TEXT,
  model TEXT,
  year INTEGER,

  -- Dimensions
  length_m NUMERIC(5,2),
  beam_m NUMERIC(5,2),
  draft_m NUMERIC(5,2),
  cabins INTEGER,
  berths INTEGER,
  heads INTEGER,

  -- Engine
  engine_type TEXT,
  engine_hp INTEGER,
  engine_hours INTEGER,
  fuel_type TEXT,

  -- Price (the key difference vs charter_boats)
  sale_price NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  price_negotiable BOOLEAN DEFAULT false,
  vat_included BOOLEAN DEFAULT false,

  -- Location
  location TEXT,
  base_port TEXT,
  country TEXT,
  region TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),

  -- Condition
  condition TEXT CHECK (condition IN ('new','like_new','good','fair','project')),
  hours_used INTEGER,
  last_refit_year INTEGER,

  -- Equipment & description
  features TEXT[] DEFAULT '{}',
  equipment JSONB,
  description TEXT,
  history TEXT, -- ownership history, refits

  -- Media
  images TEXT[] DEFAULT '{}',
  documents JSONB, -- survey reports, certificates as URLs

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','reserved','sold','archived')),
  featured BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,

  -- Contact
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,

  -- Source info (for auto-scraped sale listings)
  detail_url TEXT,
  source_domain TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  sold_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sale_boats_status ON sale_boats(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sale_boats_type ON sale_boats(boat_type, status);
CREATE INDEX IF NOT EXISTS idx_sale_boats_country ON sale_boats(country, status);
CREATE INDEX IF NOT EXISTS idx_sale_boats_price ON sale_boats(sale_price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sale_boats_partner ON sale_boats(partner_id);

-- Text search vector
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_boats' AND column_name = 'search_vector') THEN
    ALTER TABLE sale_boats ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(brand, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(model, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(location, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(country, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(description, '')), 'D')
      ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sale_boats_search ON sale_boats USING GIN(search_vector);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_sale_boats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sale_boats_updated_at ON sale_boats;
CREATE TRIGGER sale_boats_updated_at
  BEFORE UPDATE ON sale_boats
  FOR EACH ROW EXECUTE FUNCTION update_sale_boats_updated_at();

-- RLS
ALTER TABLE sale_boats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active sale boats" ON sale_boats;
CREATE POLICY "Public read active sale boats" ON sale_boats
  FOR SELECT USING (status = 'active' OR auth.uid() = partner_id);

DROP POLICY IF EXISTS "Partners manage own sale boats" ON sale_boats;
CREATE POLICY "Partners manage own sale boats" ON sale_boats
  FOR ALL
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

DROP POLICY IF EXISTS "Service role full access sale boats" ON sale_boats;
CREATE POLICY "Service role full access sale boats" ON sale_boats
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- 3) Listing kind unification (so search can query both)
-- ─────────────────────────────────────────────

-- Add 'listing_kind' to crm_entries so users can save BOTH charter and sale boats
ALTER TABLE crm_entries ADD COLUMN IF NOT EXISTS listing_kind TEXT DEFAULT 'charter'
  CHECK (listing_kind IN ('charter','sale'));
