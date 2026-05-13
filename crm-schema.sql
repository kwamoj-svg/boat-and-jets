-- ═══════════════════════════════════════════════════════════
-- VELIQA CRM — User-side CRM for tracking boat interest pipeline
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Boat reference
  boat_name TEXT NOT NULL,
  boat_data JSONB,         -- snapshot of listing (price, location, etc.)
  source_url TEXT NOT NULL,
  image_url TEXT,

  -- Pipeline stage
  status TEXT NOT NULL DEFAULT 'interested'
    CHECK (status IN ('interested','contacted','quoted','negotiating','booked','completed','cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high')),

  -- Contact details
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  company_name TEXT,

  -- Booking details
  charter_start DATE,
  charter_end DATE,
  guests INTEGER,
  quoted_price NUMERIC(10,2),
  final_price NUMERIC(10,2),
  currency TEXT DEFAULT 'EUR',

  -- Notes & reminders
  notes TEXT,
  next_action TEXT,
  reminder_date TIMESTAMPTZ,
  reminder_done BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, source_url)
);

CREATE INDEX IF NOT EXISTS idx_crm_user ON crm_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_status ON crm_entries(user_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_reminder ON crm_entries(user_id, reminder_date) WHERE reminder_date IS NOT NULL AND reminder_done = false;

-- Activity log (timeline of changes / contacts)
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES crm_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL
    CHECK (activity_type IN ('note','call','email','status_change','quote_received','meeting','reminder')),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_entry ON crm_activities(entry_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_entries_updated_at ON crm_entries;
CREATE TRIGGER crm_entries_updated_at
  BEFORE UPDATE ON crm_entries
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

-- RLS
ALTER TABLE crm_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own crm" ON crm_entries;
CREATE POLICY "Users see own crm" ON crm_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own activities" ON crm_activities;
CREATE POLICY "Users see own activities" ON crm_activities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
