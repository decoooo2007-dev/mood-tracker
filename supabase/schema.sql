-- MoodFlow Authoritative Idempotent Schema (Project: kcklqdtxlnwkhkbhxfei)
-- Safe to run repeatedly: ZERO DROP TABLE statements.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_username_length CHECK (char_length(btrim(username)) BETWEEN 3 AND 30)
);

CREATE TABLE IF NOT EXISTS public.mood_entries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT NOT NULL CHECK (mood IN ('happy', 'calm', 'excited', 'neutral', 'sad', 'frustrated')),
  mood_label TEXT NOT NULL,
  intensity SMALLINT NOT NULL DEFAULT 5 CHECK (intensity BETWEEN 1 AND 10),
  text TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  sentiment JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'ocean', 'sunset', 'forest')),
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_time TEXT NOT NULL DEFAULT '20:00',
  weekly_digest BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON public.mood_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON public.users (LOWER(username));

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.mood_entries FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_settings FROM anon, authenticated;
