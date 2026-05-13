-- ═══════════════════════════════════════════════════════════
-- VELIQA — Model alerts (notify when a boat matches user criteria)
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Add 'kind' column to notification_alerts so we can distinguish charter alerts
-- from sale-boat alerts (and brokerage leads later)
ALTER TABLE notification_alerts ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'charter'
  CHECK (kind IN ('charter','sale','broker_lead'));

-- Triggered alerts log — one row per (alert, boat) that matched
CREATE TABLE IF NOT EXISTS alert_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES notification_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What kind of match it is
  match_kind TEXT NOT NULL CHECK (match_kind IN ('charter','sale','broker_lead')),

  -- Reference to whatever it matched (we store the FK loosely so different tables work)
  matched_table TEXT NOT NULL,         -- 'charter_boats' | 'sale_boats' | 'broker_leads'
  matched_id UUID NOT NULL,

  -- Snapshot for notifications (in case the source row gets deleted)
  snapshot JSONB NOT NULL,

  -- Notification status
  notified_at TIMESTAMPTZ,
  notification_channel TEXT,           -- 'email' | 'in_app' | 'push'
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(alert_id, matched_table, matched_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_triggers_user ON alert_triggers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_unread ON alert_triggers(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_triggers_unnotified ON alert_triggers(alert_id) WHERE notified_at IS NULL;

ALTER TABLE alert_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own triggers" ON alert_triggers;
CREATE POLICY "Users see own triggers" ON alert_triggers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own triggers" ON alert_triggers;
CREATE POLICY "Users update own triggers" ON alert_triggers
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages triggers" ON alert_triggers;
CREATE POLICY "Service role manages triggers" ON alert_triggers
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Broker-related: a broker_leads table for the lead-gen agent (next phase)
CREATE TABLE IF NOT EXISTS broker_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lead intent
  intent TEXT NOT NULL CHECK (intent IN ('buy','sell','charter')),
  source_platform TEXT,     -- 'instagram' | 'linkedin' | 'facebook' | 'reddit' | 'forum' | 'kleinanzeigen'
  source_url TEXT,
  source_post_id TEXT,

  -- Detected boat
  boat_type TEXT,
  brand TEXT,
  model TEXT,
  year INTEGER,
  length_m NUMERIC(5,2),
  asking_price NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  location TEXT,
  country TEXT,

  -- Contact (often only partial)
  poster_name TEXT,
  poster_handle TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_whatsapp TEXT,

  -- Raw content for review
  raw_text TEXT,
  images TEXT[],
  language TEXT,
  posted_at TIMESTAMPTZ,

  -- Lead quality (AI scored)
  quality_score NUMERIC(3,2),   -- 0..1
  quality_reasons TEXT[],

  -- Assignment to broker
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','reviewing','contacted','converted','rejected','expired')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(source_platform, source_post_id)
);

CREATE INDEX IF NOT EXISTS idx_broker_leads_status ON broker_leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_leads_brand_model ON broker_leads(brand, model);
CREATE INDEX IF NOT EXISTS idx_broker_leads_assigned ON broker_leads(assigned_to, status);

ALTER TABLE broker_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brokers see assigned + unassigned leads" ON broker_leads;
CREATE POLICY "Brokers see assigned + unassigned leads" ON broker_leads
  FOR SELECT USING (
    auth.uid() = assigned_to
    OR (assigned_to IS NULL AND auth.uid() IS NOT NULL)
  );

DROP POLICY IF EXISTS "Service role manages broker_leads" ON broker_leads;
CREATE POLICY "Service role manages broker_leads" ON broker_leads
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- updated_at trigger for broker_leads
DROP TRIGGER IF EXISTS broker_leads_updated_at ON broker_leads;
CREATE TRIGGER broker_leads_updated_at
  BEFORE UPDATE ON broker_leads
  FOR EACH ROW EXECUTE FUNCTION update_sale_boats_updated_at();
