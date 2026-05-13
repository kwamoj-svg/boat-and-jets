-- ═══════════════════════════════════════════════════════════
-- VELIQA — Setup admin role for yourself + approve own partner account
-- Run in Supabase SQL Editor
--
-- This makes YOU (the currently logged-in account on veliqa.life)
-- an admin and approves your pending partner application.
-- ═══════════════════════════════════════════════════════════

-- 1) Make sure profiles table has a 'role' column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'partner', 'broker'));

-- 2) Promote yourself to admin
--    REPLACE 'your-email@example.com' with your actual login email!
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- 3) Approve your own partner application
UPDATE partners
SET status = 'approved'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- 4) Optional: approve ALL pending partners (do this only if you trust the
-- current applications — useful during early testing phase)
-- UPDATE partners SET status = 'approved' WHERE status = 'pending';

-- 5) Verify it worked
SELECT
  u.email,
  p.role AS profile_role,
  pa.status AS partner_status,
  pa.company_name
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN partners pa ON pa.user_id = u.id
WHERE u.email = 'your-email@example.com';
