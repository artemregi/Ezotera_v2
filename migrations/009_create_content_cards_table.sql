CREATE TABLE IF NOT EXISTS public.content_cards (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(10) DEFAULT '✨',
    category VARCHAR(50),
    link_url VARCHAR(500),
    link_text VARCHAR(100) DEFAULT 'Подробнее',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
