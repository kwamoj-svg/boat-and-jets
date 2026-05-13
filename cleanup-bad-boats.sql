-- ═══════════════════════════════════════════════════════════
-- Cleanup bad scraped boats: prices < 50 EUR/day, duplicate-brand names
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1) Null out obviously-broken prices (under 50€/day)
UPDATE charter_boats
SET price_per_day = NULL
WHERE price_per_day < 50;

UPDATE charter_boats
SET price_per_week = NULL
WHERE price_per_week < 200;

-- 2) Fix names like "Azimut Azimut 58" → "Azimut 58" (regex collapse of repeated brand)
UPDATE charter_boats
SET name = regexp_replace(name, '^([A-Za-z]+) +\1\b', '\1', 'i')
WHERE name ~* '^([A-Za-z]+) +\1\b';

-- 3) Same cleanup on sale_boats
UPDATE sale_boats
SET name = regexp_replace(name, '^([A-Za-z]+) +\1\b', '\1', 'i')
WHERE name ~* '^([A-Za-z]+) +\1\b';

-- 4) Delete boats with no useful info (no price AND no description AND auto-scraped)
DELETE FROM charter_boats
WHERE source = 'auto_scrape'
  AND price_per_day IS NULL
  AND price_per_week IS NULL
  AND (description IS NULL OR length(description) < 30)
  AND (images IS NULL OR array_length(images, 1) IS NULL);

-- 5) Clean up junk suffixes in names (e.g. "Hallberg Rassy 352 Copy Improoved"
-- → "Hallberg Rassy 352"). These come from scraping listings that the source
-- platform tagged as 'Copy of' or 'Improved'/'Improoved'.
UPDATE charter_boats
SET name = regexp_replace(name,
  '\s+(Copy|Kopie|Improoved|Improved|Verbessert|Beep|Beep B|Bee B)\b.*$',
  '', 'i')
WHERE name ~* '\s+(Copy|Kopie|Improoved|Improved|Verbessert|Beep)\b';

UPDATE sale_boats
SET name = regexp_replace(name,
  '\s+(Copy|Kopie|Improoved|Improved|Verbessert)\b.*$',
  '', 'i')
WHERE name ~* '\s+(Copy|Kopie|Improoved|Improved|Verbessert)\b';

-- 6) Also remove cryptic listing-id suffixes like "B2qp7b" or "1Ggykbz"
-- (random alphanumeric tokens of 5-8 chars at end of name)
UPDATE charter_boats
SET name = regexp_replace(name, '\s+[A-Za-z0-9]{5,8}$', '')
WHERE name ~ '\s+[A-Za-z0-9]{5,8}$'
  AND name !~ '[A-Z][a-z]+\s+\d+$'; -- don't strip "Lagoon 46" type real models

-- 5) Report what's left
SELECT
  COUNT(*) AS total_active,
  COUNT(price_per_day) AS with_daily_price,
  COUNT(price_per_week) AS with_weekly_price,
  COUNT(DISTINCT country) AS countries
FROM charter_boats
WHERE status = 'active';
