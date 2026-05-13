-- ═══════════════════════════════════════════════════════════
-- Add unique index on slug for charter_boats + sale_boats
-- Required for the Samboat bulk scraper's upsert(onConflict='slug')
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1) De-duplicate any existing rows that share a slug (keep the newest)
WITH dups AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at DESC) AS rn
  FROM charter_boats
  WHERE slug IS NOT NULL
)
DELETE FROM charter_boats
WHERE id IN (SELECT id FROM dups WHERE rn > 1);

-- 2) Add unique index
CREATE UNIQUE INDEX IF NOT EXISTS uniq_charter_boats_slug
  ON charter_boats(slug)
  WHERE slug IS NOT NULL;

-- 3) Same for sale_boats (already declared UNIQUE in schema, but ensure index exists)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sale_boats_slug
  ON sale_boats(slug)
  WHERE slug IS NOT NULL;

-- 4) Verify
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('charter_boats', 'sale_boats')
  AND indexname LIKE '%slug%';
