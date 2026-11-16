-- MoodFlow Authoritative Idempotent Schema (Project: kcklqdtxlnwkhkbhxfei)
-- Safe to run repeatedly: ZERO DROP TABLE statements.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT users_username_length CHECK (char_length(btrim(username)) BETWEEN 3 AND 30)
);

CREATE TABLE IF NOT EXISTS public.mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TEXT NOT NULL DEFAULT '',
  mood TEXT NOT NULL CHECK (mood IN ('Happy', 'Calm', 'Sad', 'Frustrated', 'Tired')),
  intensity INTEGER NOT NULL DEFAULT 50 CHECK (intensity >= 0 AND intensity <= 100),
  text TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  sentiment_score DOUBLE PRECISION DEFAULT 0,
  sentiment_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  notifications BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_time TEXT NOT NULL DEFAULT '21:00',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  export_format TEXT NOT NULL DEFAULT 'json' CHECK (export_format IN ('json', 'csv', 'pdf')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
  ON public.users (LOWER(username));

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date
  ON public.mood_entries (user_id, date DESC, created_at DESC);

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

-- ============================================================================
-- Supabase Vault (Encrypted Secrets Hardening — cybersecurity-hub Standard)
-- ============================================================================
-- Stores third-party provider keys (e.g., GEMINI_API_KEY, RESEND_API_KEY,
-- KEEP_ALIVE_SECRET, future PAYMOB_API_KEY) encrypted at rest via pgsodium /
-- supabase_vault. Strictly locked to service_role; anon & authenticated roles
-- have ZERO access to vault tables or secret reader functions.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'supabase_vault'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Gracefully skip if running on a local Postgres instance without supabase_vault
    NULL;
END $$;

CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'vault'
      AND table_name = 'decrypted_secrets'
  ) THEN
    EXECUTE
      'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1'
      INTO secret_value
      USING secret_name;
  END IF;
  RETURN secret_value;
END;
$$;

REVOKE ALL ON FUNCTION public.get_vault_secret(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vault_secret(TEXT) TO service_role;
