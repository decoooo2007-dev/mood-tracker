-- Drop existing tables if they exist (with RLS issues)
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.mood_entries CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Custom users table for username/password auth
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mood entries table with user reference
CREATE TABLE public.mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  mood TEXT NOT NULL,
  intensity INTEGER NOT NULL,
  text TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  sentiment_score REAL DEFAULT 0,
  sentiment_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table with user reference
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  notifications BOOLEAN DEFAULT true,
  reminder_time TEXT DEFAULT '21:00',
  language TEXT DEFAULT 'en',
  export_format TEXT DEFAULT 'json',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IMPORTANT: Disable RLS so our custom auth can work
-- Our auth uses x-user-id header instead of Supabase Auth
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY;

-- Create indexes for faster queries
CREATE INDEX idx_mood_entries_user_id ON public.mood_entries(user_id);
CREATE INDEX idx_mood_entries_date ON public.mood_entries(date);
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);
