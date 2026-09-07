-- Migration 010: create missing tables used by api/palmistry/* and api/horoscope.js
-- palm_analyses: stores palm reading sessions (upload.js INSERT, unlock.js SELECT/UPDATE)
-- horoscopes: stores weekly horoscope JSON (api/horoscope.js reads latest row)

CREATE TABLE IF NOT EXISTS public.palm_analyses (
    id            SERIAL PRIMARY KEY,
    session_id    VARCHAR(128) UNIQUE NOT NULL,
    user_id       INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    preview_text  TEXT NOT NULL,
    full_text     TEXT NOT NULL,
    hand_score    REAL DEFAULT 0.7,
    seed_data     JSONB DEFAULT '{}',
    ip_hash       VARCHAR(64),
    refresh_count INTEGER DEFAULT 0,
    paid_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_palm_analyses_session ON public.palm_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_palm_analyses_user ON public.palm_analyses(user_id);

CREATE TABLE IF NOT EXISTS public.horoscopes (
    id         SERIAL PRIMARY KEY,
    data       JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_horoscopes_created ON public.horoscopes(created_at DESC);
