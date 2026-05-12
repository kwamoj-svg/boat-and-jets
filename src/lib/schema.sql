-- BOAT & JETS — Database Schema
-- AI-Powered Yacht Discovery Engine

-- ━━━━━━━━━━━━━━━━━━━
-- CORE ENTITIES
-- ━━━━━━━━━━━━━━━━━━━

CREATE TABLE boats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('sailing','motor','catamaran','superyacht','speedboat','gulet')),
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  year          INT,
  length_ft     NUMERIC(6,1),
  cabins        INT,
  max_guests    INT,
  crew          INT,
  images        TEXT[] DEFAULT '{}',
  features      TEXT[] DEFAULT '{}',
  description   TEXT,
  fingerprint   TEXT UNIQUE, -- dedup hash: brand + model + year + length
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE providers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('charter_company','broker','dealer','private')),
  website       TEXT,
  logo_url      TEXT,
  verified      BOOLEAN DEFAULT false,
  rating        NUMERIC(2,1) DEFAULT 0,
  sponsor_tier  TEXT CHECK (sponsor_tier IN ('basic','premium','featured')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id         UUID NOT NULL REFERENCES boats(id),
  provider_id     UUID REFERENCES providers(id),
  listing_type    TEXT NOT NULL CHECK (listing_type IN ('charter','sale')),
  price_per_week  NUMERIC(12,2),
  price_per_day   NUMERIC(12,2),
  sale_price      NUMERIC(14,2),
  currency        TEXT DEFAULT 'EUR',
  region          TEXT NOT NULL,
  country         TEXT NOT NULL,
  port            TEXT,
  available_from  DATE,
  available_to    DATE,
  luxury_level    INT CHECK (luxury_level BETWEEN 1 AND 5),
  is_featured     BOOLEAN DEFAULT false,
  source_url      TEXT,
  source_platform TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ━━━━━━━━━━━━━━━━━━━
-- SEARCH & AI
-- ━━━━━━━━━━━━━━━━━━━

CREATE TABLE searches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_query     TEXT NOT NULL,
  parsed_query  JSONB NOT NULL,
  result_count  INT DEFAULT 0,
  user_id       UUID,
  session_id    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE recommendations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id     UUID REFERENCES searches(id),
  listing_id    UUID REFERENCES listings(id),
  score         NUMERIC(4,3) NOT NULL,
  match_reasons JSONB NOT NULL DEFAULT '[]',
  ai_summary    TEXT,
  position      INT NOT NULL,
  clicked       BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ━━━━━━━━━━━━━━━━━━━
-- B2B SPONSORSHIP
-- ━━━━━━━━━━━━━━━━━━━

CREATE TABLE sponsor_tiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  price_monthly   NUMERIC(10,2) NOT NULL,
  boost_factor    NUMERIC(3,2) DEFAULT 1.0,
  max_listings    INT DEFAULT 10,
  badge_label     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sponsorships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID REFERENCES providers(id),
  tier_id         UUID REFERENCES sponsor_tiers(id),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ━━━━━━━━━━━━━━━━━━━
-- SCRAPING PIPELINE
-- ━━━━━━━━━━━━━━━━━━━

CREATE TABLE scraped_raw (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url      TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  raw_html        TEXT,
  raw_json        JSONB,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processed','failed','duplicate')),
  scraped_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dedup_matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id    UUID REFERENCES boats(id),
  duplicate_url   TEXT NOT NULL,
  similarity      NUMERIC(4,3) NOT NULL,
  resolved_at     TIMESTAMPTZ DEFAULT now()
);

-- ━━━━━━━━━━━━━━━━━━━
-- INDEXES
-- ━━━━━━━━━━━━━━━━━━━

CREATE INDEX idx_listings_region ON listings(region);
CREATE INDEX idx_listings_type ON listings(listing_type);
CREATE INDEX idx_listings_luxury ON listings(luxury_level);
CREATE INDEX idx_listings_price_week ON listings(price_per_week);
CREATE INDEX idx_listings_boat ON listings(boat_id);
CREATE INDEX idx_boats_type ON boats(type);
CREATE INDEX idx_boats_fingerprint ON boats(fingerprint);
CREATE INDEX idx_searches_created ON searches(created_at DESC);
CREATE INDEX idx_recommendations_search ON recommendations(search_id);
CREATE INDEX idx_scraped_status ON scraped_raw(status);

-- Default sponsor tiers
INSERT INTO sponsor_tiers (name, price_monthly, boost_factor, max_listings, badge_label) VALUES
  ('basic',    299,  1.2, 10, 'Verified'),
  ('premium',  799,  1.5, 50, 'Premium'),
  ('featured', 1999, 2.0, -1, 'Featured Partner');
