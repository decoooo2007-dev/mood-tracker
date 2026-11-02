-- Gate A1: Non-Destructive Live Migration & RLS Lockdown (Project: kcklqdtxlnwkhkbhxfei)
-- ZERO DROP TABLE statements. Preserves all existing rows in public.users, public.mood_entries, and public.user_settings.

BEGIN;

-- 1. Drop broken legacy GoTrue trigger from supabase-schema.sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Harden public.users (preserve all 8 existing rows including Arabic username 'سامي')
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
  ON public.users (LOWER(username));

-- 3. Harden public.mood_entries (preserve all 11 existing rows)
ALTER TABLE public.mood_entries
  ALTER COLUMN text SET DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.mood_entries
  DROP CONSTRAINT IF EXISTS check_valid_mood,
  ADD CONSTRAINT check_valid_mood
    CHECK (mood IN ('Happy', 'Calm', 'Sad', 'Frustrated', 'Tired'));

ALTER TABLE public.mood_entries
  DROP CONSTRAINT IF EXISTS check_valid_intensity,
  ADD CONSTRAINT check_valid_intensity
    CHECK (intensity >= 0 AND intensity <= 100);

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date
  ON public.mood_entries (user_id, date DESC, created_at DESC);

-- 4. Automated updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_mood_entries_updated_at ON public.mood_entries;
CREATE TRIGGER trg_mood_entries_updated_at
  BEFORE UPDATE ON public.mood_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. Enable & Force RLS on all 3 tables + Revoke direct anon/authenticated access
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.users FROM anon, authenticated;
REVOKE ALL ON public.mood_entries FROM anon, authenticated;
REVOKE ALL ON public.user_settings FROM anon, authenticated;

GRANT ALL ON public.users, public.mood_entries, public.user_settings TO service_role;

-- Explicit service_role policies to satisfy Supabase Security Advisor (0008_rls_enabled_no_policy)
DROP POLICY IF EXISTS "service_role_all_users" ON public.users;
CREATE POLICY "service_role_all_users"
  ON public.users FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_mood_entries" ON public.mood_entries;
CREATE POLICY "service_role_all_mood_entries"
  ON public.mood_entries FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_user_settings" ON public.user_settings;
CREATE POLICY "service_role_all_user_settings"
  ON public.user_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
