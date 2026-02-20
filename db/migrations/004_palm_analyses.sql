-- Migration: Create palm_analyses table for palmistry feature
-- Run this in your Vercel Postgres / Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.palm_analyses (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    session_id      VARCHAR(255) UNIQUE NOT NULL,

    -- Generated content
    preview_text    TEXT NOT NULL,
    full_text       TEXT NOT NULL,

    -- Payment state
    paid_at         TIMESTAMP,

    -- Metadata used during generation (for reproducibility)
    hand_score      FLOAT DEFAULT 0,       -- 0-1 "confidence" from client-side detection
    seed_data       JSONB DEFAULT '{}',    -- name, gender, focus_area from onboarding

    -- Anti-abuse
    ip_hash         VARCHAR(64),           -- SHA-256 of IP, never raw IP
    refresh_count   INTEGER DEFAULT 0,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_palm_session  ON public.palm_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_palm_user     ON public.palm_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_palm_created  ON public.palm_analyses(created_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_palm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_palm_updated_at ON public.palm_analyses;
CREATE TRIGGER trg_palm_updated_at
    BEFORE UPDATE ON public.palm_analyses
    FOR EACH ROW EXECUTE FUNCTION update_palm_updated_at();
