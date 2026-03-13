-- Migration 005: Create orders table for payment tracking
-- Run this in your Vercel Postgres / Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.orders (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    user_email  VARCHAR(255),           -- cached for receipt email
    inv_id      INTEGER UNIQUE NOT NULL, -- Robokassa InvId
    amount      NUMERIC(10,2) NOT NULL,
    description TEXT,
    status      VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending | paid | failed
    is_test     BOOLEAN DEFAULT FALSE,
    paid_at     TIMESTAMP,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_inv_id  ON public.orders(inv_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON public.orders(status);
