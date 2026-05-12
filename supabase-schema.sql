-- =============================================
-- VELIQA Database Schema for Supabase
-- Run this in the Supabase SQL Editor
-- =============================================

-- ─────────────────────────────────────────────
-- 1. SEARCH CACHE — stores full search results for 6 hours
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 2. BOAT REGISTRY — individual boats with verified detail URLs
-- ─────────────────────────────────────────────
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
  UNIQUE(name, source_domain)
);

CREATE INDEX IF NOT EXISTS idx_boats_country ON boats(country);
CREATE INDEX IF NOT EXISTS idx_boats_type ON boats(type);
CREATE INDEX IF NOT EXISTS idx_boats_domain ON boats(source_domain);
CREATE INDEX IF NOT EXISTS idx_boats_guests ON boats(guests);
CREATE INDEX IF NOT EXISTS idx_boats_price ON boats(price_per_day);
CREATE INDEX IF NOT EXISTS idx_boats_updated ON boats(updated_at DESC);

-- ─────────────────────────────────────────────
-- 3. USER PROFILES — extends Supabase auth.users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  preferred_currency TEXT DEFAULT 'EUR',
  preferred_regions TEXT[] DEFAULT '{}',
  preferred_boat_types TEXT[] DEFAULT '{}',
  notification_email BOOLEAN DEFAULT TRUE,
  notification_push BOOLEAN DEFAULT FALSE,
  language TEXT DEFAULT 'de',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'partner', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- 4. SAVED BOATS — user favorites
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boat_name TEXT NOT NULL,
  boat_data JSONB NOT NULL,
  source_url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_url)
);

CREATE INDEX IF NOT EXISTS idx_saved_boats_user ON saved_boats(user_id);

-- ─────────────────────────────────────────────
-- 5. SEARCH HISTORY — user search log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  parsed_query JSONB,
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at DESC);

-- ─────────────────────────────────────────────
-- 6. CONTACTS — charter companies, dealers, brokers
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('charter_company', 'broker', 'dealer', 'marina', 'agent')),
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  region TEXT,
  description TEXT,
  logo_url TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_youtube TEXT,
  verified BOOLEAN DEFAULT FALSE,
  partner_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_country ON contacts(country);
CREATE INDEX IF NOT EXISTS idx_contacts_city ON contacts(city);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);

-- ─────────────────────────────────────────────
-- 7. BOAT_CONTACTS — links boats to their operators
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boat_contacts (
  boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'operator',
  PRIMARY KEY (boat_id, contact_id)
);

-- ─────────────────────────────────────────────
-- 8. PARTNERS — verified B2B partner companies
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_type TEXT NOT NULL CHECK (company_type IN ('charter_company', 'broker', 'dealer', 'marina')),
  website TEXT,
  phone TEXT,
  email TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  logo_url TEXT,
  description TEXT,
  tax_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  tier TEXT DEFAULT 'basic' CHECK (tier IN ('basic', 'premium', 'featured')),
  max_listings INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_user ON partners(user_id);

-- ─────────────────────────────────────────────
-- 9. PARTNER_BOATS — boats managed by partners
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  boat_id UUID REFERENCES boats(id),
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
  description TEXT,
  features JSONB DEFAULT '[]',
  images TEXT[] DEFAULT '{}',
  availability JSONB,
  contact_phone TEXT,
  contact_email TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_boats_partner ON partner_boats(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_boats_status ON partner_boats(status);
CREATE INDEX IF NOT EXISTS idx_partner_boats_country ON partner_boats(country);

-- ─────────────────────────────────────────────
-- 10. NOTIFICATION ALERTS — user-defined boat alerts
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_name TEXT NOT NULL,
  criteria JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON notification_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON notification_alerts(is_active);

-- ─────────────────────────────────────────────
-- 11. NOTIFICATIONS — push notifications to users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES notification_alerts(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('boat_match', 'price_drop', 'new_listing', 'system', 'partner')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- ─────────────────────────────────────────────
-- 12. EXPERIENCE TAGS — searchable experience types
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experience_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label_en TEXT NOT NULL,
  label_de TEXT NOT NULL,
  description TEXT,
  keywords TEXT[] NOT NULL,
  boat_type_affinity TEXT[],
  luxury_min INTEGER DEFAULT 1,
  luxury_max INTEGER DEFAULT 5,
  guest_min INTEGER,
  guest_max INTEGER,
  features_required TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed experience tags
INSERT INTO experience_tags (slug, label_en, label_de, keywords, boat_type_affinity, luxury_min, luxury_max) VALUES
  ('romantic-sunset', 'Romantic Sunset Cruise', 'Romantischer Sonnenuntergang', ARRAY['romantic','sunset','couple','honeymoon','anniversary','love','zweisamkeit'], ARRAY['sailing','catamaran'], 3, 5),
  ('family-adventure', 'Family Adventure', 'Familienabenteuer', ARRAY['family','kids','children','familie','kinder','safe','adventure'], ARRAY['catamaran','motor','sailing'], 2, 4),
  ('party-boat', 'Party Boat', 'Partyboot', ARRAY['party','celebration','birthday','jga','bachelor','bachelorette','music','dj','feier'], ARRAY['motor','catamaran'], 2, 5),
  ('fishing-trip', 'Fishing Trip', 'Angelausflug', ARRAY['fishing','angeln','deep sea','sport fishing','trolling'], ARRAY['motor','speedboat'], 1, 3),
  ('diving-expedition', 'Diving Expedition', 'Tauchexpedition', ARRAY['diving','tauchen','snorkeling','schnorcheln','reef','coral','underwater'], ARRAY['motor','catamaran'], 2, 4),
  ('luxury-escape', 'Luxury Escape', 'Luxus-Auszeit', ARRAY['luxury','luxus','premium','exclusive','vip','5-star','champagne','caviar'], ARRAY['superyacht','catamaran','motor'], 4, 5),
  ('island-hopping', 'Island Hopping', 'Insel-Hopping', ARRAY['island','insel','hopping','cruise','tour','multi-stop','exploring'], ARRAY['sailing','catamaran'], 2, 5),
  ('weekend-getaway', 'Weekend Getaway', 'Wochenendausflug', ARRAY['weekend','wochenende','short','kurz','2 tage','3 tage','mini-urlaub'], ARRAY['motor','sailing','catamaran'], 2, 4),
  ('corporate-event', 'Corporate Event', 'Firmenevent', ARRAY['corporate','firma','business','team','event','meeting','incentive','teambuilding'], ARRAY['motor','catamaran','superyacht'], 3, 5),
  ('sailing-lesson', 'Sailing Lesson', 'Segelkurs', ARRAY['sailing','lesson','kurs','lernen','learn','training','anfaenger','beginner','skipper'], ARRAY['sailing'], 1, 3),
  ('coastal-exploration', 'Coastal Exploration', 'Küstenerkundung', ARRAY['coastal','küste','coast','explore','entdecken','bay','bucht','grotto','cave'], ARRAY['motor','sailing','speedboat'], 2, 4),
  ('overnight-cruise', 'Overnight Cruise', 'Übernachtungstörn', ARRAY['overnight','übernachtung','sleep','schlafen','cabin','kabine','mehrtägig','multi-day'], ARRAY['sailing','catamaran','motor'], 3, 5),
  ('day-trip', 'Day Trip', 'Tagesausflug', ARRAY['day','tag','trip','ausflug','afternoon','nachmittag','morning'], ARRAY['motor','speedboat','sailing'], 1, 4),
  ('watersports', 'Watersports Adventure', 'Wassersport-Abenteuer', ARRAY['watersport','wassersport','jetski','wakeboard','waterski','tube','paddle','sup','kayak'], ARRAY['motor','speedboat'], 2, 4),
  ('sunset-dinner', 'Sunset Dinner Cruise', 'Dinner bei Sonnenuntergang', ARRAY['dinner','abendessen','sunset','sonnenuntergang','food','essen','gourmet','chef'], ARRAY['motor','catamaran','sailing'], 3, 5)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- 13. USER INTERACTIONS — for preference learning
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boat_name TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'save', 'click_link', 'unsave', 'dismiss')),
  boat_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_interactions(interaction_type);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY POLICIES
-- ─────────────────────────────────────────────

-- Search cache & boats: anon read/write (server-side app)
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_search_cache" ON search_cache FOR SELECT USING (true);
CREATE POLICY "anon_insert_search_cache" ON search_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_search_cache" ON search_cache FOR UPDATE USING (true);
CREATE POLICY "anon_read_boats" ON boats FOR SELECT USING (true);
CREATE POLICY "anon_insert_boats" ON boats FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_boats" ON boats FOR UPDATE USING (true);

-- Profiles: users read/update own, admins read all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "service_insert_profile" ON profiles FOR INSERT WITH CHECK (true);

-- Saved boats: users CRUD own only
ALTER TABLE saved_boats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_crud_own_saved" ON saved_boats FOR ALL USING (auth.uid() = user_id);

-- Search history: users read own only
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_crud_own_history" ON search_history FOR ALL USING (auth.uid() = user_id);

-- Contacts: public read, admin write
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_contacts" ON contacts FOR SELECT USING (true);
CREATE POLICY "anon_insert_contacts" ON contacts FOR INSERT WITH CHECK (true);

-- Boat contacts: public read
ALTER TABLE boat_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_boat_contacts" ON boat_contacts FOR SELECT USING (true);
CREATE POLICY "anon_insert_boat_contacts" ON boat_contacts FOR INSERT WITH CHECK (true);

-- Partners: users read own, admins read all
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_partner" ON partners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_partner" ON partners FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_partner" ON partners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "public_read_approved_partners" ON partners FOR SELECT USING (status = 'approved');

-- Partner boats: partner manages own, public reads active
ALTER TABLE partner_boats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_manage_own_boats" ON partner_boats FOR ALL
  USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));
CREATE POLICY "public_read_active_partner_boats" ON partner_boats FOR SELECT USING (status = 'active');

-- Notification alerts: users CRUD own
ALTER TABLE notification_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_crud_own_alerts" ON notification_alerts FOR ALL USING (auth.uid() = user_id);

-- Notifications: users read own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_crud_own_notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "service_insert_notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Experience tags: public read
ALTER TABLE experience_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_experiences" ON experience_tags FOR SELECT USING (true);

-- User interactions: users CRUD own
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_crud_own_interactions" ON user_interactions FOR ALL USING (auth.uid() = user_id);
