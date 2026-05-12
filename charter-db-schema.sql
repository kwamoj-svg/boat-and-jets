-- ============================================================
-- VELIQA Charter Database Schema
-- Two tables: charter_companies + charter_boats
-- ============================================================

-- ─── charter_companies ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS charter_companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  company_type    TEXT CHECK (company_type IN ('charter','broker','dealer','marina','rental')),
  country         TEXT NOT NULL,
  region          TEXT,
  city            TEXT,
  marina          TEXT,
  address         TEXT,
  phone           TEXT,
  phone_2         TEXT,
  email           TEXT,
  email_booking   TEXT,
  website         TEXT,
  whatsapp        TEXT,
  instagram       TEXT,
  facebook        TEXT,
  youtube         TEXT,
  tiktok          TEXT,
  languages       TEXT[] DEFAULT '{en}',
  description     TEXT,
  logo_url        TEXT,
  cover_image     TEXT,
  fleet_size      INTEGER DEFAULT 0,
  year_founded    INTEGER,
  license_number  TEXT,
  price_range     TEXT,
  rating          NUMERIC(2,1),
  review_count    INTEGER DEFAULT 0,
  verified        BOOLEAN DEFAULT FALSE,
  featured        BOOLEAN DEFAULT FALSE,
  operating_regions TEXT[] DEFAULT '{}',
  services        TEXT[] DEFAULT '{}',
  payment_methods TEXT[] DEFAULT '{}',
  certifications  TEXT[] DEFAULT '{}',
  peak_season     TEXT,
  response_time   TEXT DEFAULT 'unknown',
  search_vector   TSVECTOR,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes for charter_companies
CREATE INDEX IF NOT EXISTS idx_cc_country       ON charter_companies (country);
CREATE INDEX IF NOT EXISTS idx_cc_region        ON charter_companies (region);
CREATE INDEX IF NOT EXISTS idx_cc_company_type  ON charter_companies (company_type);
CREATE INDEX IF NOT EXISTS idx_cc_rating        ON charter_companies (rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_cc_featured      ON charter_companies (featured DESC, rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_cc_verified      ON charter_companies (verified);
CREATE INDEX IF NOT EXISTS idx_cc_services      ON charter_companies USING GIN (services);
CREATE INDEX IF NOT EXISTS idx_cc_regions       ON charter_companies USING GIN (operating_regions);
CREATE INDEX IF NOT EXISTS idx_cc_search        ON charter_companies USING GIN (search_vector);

-- Auto-update search_vector on charter_companies
CREATE OR REPLACE FUNCTION charter_companies_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.company_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.country, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.city, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.region, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.marina, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.services, ' '), '')), 'C');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cc_search ON charter_companies;
CREATE TRIGGER trg_cc_search
  BEFORE INSERT OR UPDATE ON charter_companies
  FOR EACH ROW EXECUTE FUNCTION charter_companies_search_trigger();

-- RLS for charter_companies
ALTER TABLE charter_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read charter_companies" ON charter_companies;
CREATE POLICY "Public read charter_companies" ON charter_companies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service write charter_companies" ON charter_companies;
CREATE POLICY "Service write charter_companies" ON charter_companies
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─── charter_boats ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS charter_boats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES charter_companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  boat_type       TEXT CHECK (boat_type IN ('sailboat','catamaran','motorboat','yacht','gulet','speedboat','jet_ski','houseboat')),
  brand           TEXT,
  model           TEXT,
  year            INTEGER,
  length_m        NUMERIC(5,1),
  beam_m          NUMERIC(4,1),
  draft_m         NUMERIC(4,1),
  cabins          INTEGER,
  berths          INTEGER,
  heads           INTEGER,
  max_guests      INTEGER,
  crew_size       INTEGER DEFAULT 0,
  engine_type     TEXT,
  engine_hp       INTEGER,
  fuel_type       TEXT,
  water_tank_l    INTEGER,
  fuel_tank_l     INTEGER,
  price_per_day   NUMERIC,
  price_per_week  NUMERIC,
  price_per_hour  NUMERIC,
  currency        TEXT DEFAULT 'EUR',
  deposit         NUMERIC,
  skipper_price   NUMERIC,
  base_port       TEXT,
  country         TEXT,
  region          TEXT,
  available_from  DATE,
  available_to    DATE,
  min_charter_days INTEGER DEFAULT 1,
  features        TEXT[] DEFAULT '{}',
  images          TEXT[] DEFAULT '{}',
  description     TEXT,
  charter_type    TEXT DEFAULT 'bareboat' CHECK (charter_type IN ('bareboat','skippered','crewed')),
  license_required BOOLEAN DEFAULT FALSE,
  pets_allowed    BOOLEAN DEFAULT FALSE,
  smoking_allowed BOOLEAN DEFAULT FALSE,
  status          TEXT DEFAULT 'active',
  detail_url      TEXT,
  source          TEXT,
  search_vector   TSVECTOR,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (company_id, name, boat_type)
);

-- Indexes for charter_boats
CREATE INDEX IF NOT EXISTS idx_cb_company     ON charter_boats (company_id);
CREATE INDEX IF NOT EXISTS idx_cb_country     ON charter_boats (country);
CREATE INDEX IF NOT EXISTS idx_cb_region      ON charter_boats (region);
CREATE INDEX IF NOT EXISTS idx_cb_boat_type   ON charter_boats (boat_type);
CREATE INDEX IF NOT EXISTS idx_cb_price_day   ON charter_boats (price_per_day ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_cb_price_week  ON charter_boats (price_per_week ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_cb_max_guests  ON charter_boats (max_guests);
CREATE INDEX IF NOT EXISTS idx_cb_brand       ON charter_boats (brand);
CREATE INDEX IF NOT EXISTS idx_cb_status      ON charter_boats (status);
CREATE INDEX IF NOT EXISTS idx_cb_features    ON charter_boats USING GIN (features);
CREATE INDEX IF NOT EXISTS idx_cb_search      ON charter_boats USING GIN (search_vector);

-- Auto-update search_vector on charter_boats
CREATE OR REPLACE FUNCTION charter_boats_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.brand, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.model, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.boat_type, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.base_port, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.country, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.region, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.features, ' '), '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'D');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cb_search ON charter_boats;
CREATE TRIGGER trg_cb_search
  BEFORE INSERT OR UPDATE ON charter_boats
  FOR EACH ROW EXECUTE FUNCTION charter_boats_search_trigger();

-- RLS for charter_boats
ALTER TABLE charter_boats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read charter_boats" ON charter_boats;
CREATE POLICY "Public read charter_boats" ON charter_boats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service write charter_boats" ON charter_boats;
CREATE POLICY "Service write charter_boats" ON charter_boats
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
