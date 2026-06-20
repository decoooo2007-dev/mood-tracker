-- MoodFlow Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Mood entries table
CREATE TABLE IF NOT EXISTS mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  mood TEXT NOT NULL CHECK (mood IN ('Happy', 'Calm', 'Sad', 'Frustrated', 'Tired')),
  intensity INTEGER NOT NULL CHECK (intensity >= 0 AND intensity <= 100),
  text TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  sentiment_score DECIMAL(3,2),
  sentiment_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  notifications BOOLEAN DEFAULT true,
  reminder_time TEXT DEFAULT '21:00',
  language TEXT DEFAULT 'en',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mood_entries
DROP POLICY IF EXISTS "Users can CRUD their own entries" ON mood_entries;
CREATE POLICY "Users can CRUD their own entries"
  ON mood_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_settings
DROP POLICY IF EXISTS "Users can CRUD their own settings" ON user_settings;
CREATE POLICY "Users can CRUD their own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
DROP INDEX IF EXISTS idx_mood_entries_user_date;
CREATE INDEX idx_mood_entries_user_date ON mood_entries(user_id, date DESC);

DROP INDEX IF EXISTS idx_mood_entries_created;
CREATE INDEX idx_mood_entries_created ON mood_entries(created_at DESC);

DROP INDEX IF EXISTS idx_mood_entries_user_id;
CREATE INDEX idx_mood_entries_user_id ON mood_entries(user_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS mood_entries_updated ON mood_entries;
CREATE TRIGGER mood_entries_updated
  BEFORE UPDATE ON mood_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS user_settings_updated ON user_settings;
CREATE TRIGGER user_settings_updated
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create user settings on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, theme, notifications, reminder_time, language)
  VALUES (NEW.id, 'dark', true, '21:00', 'en');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create settings for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable realtime for mood_entries
ALTER PUBLICATION supabase_realtime ADD TABLE mood_entries;
