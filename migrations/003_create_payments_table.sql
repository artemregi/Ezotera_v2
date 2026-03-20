-- Migration 003: Create payments table for CloudPayments transactions
-- Replaces the previous 'orders' table used with Robokassa.

CREATE TABLE IF NOT EXISTS public.payments (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    user_email        VARCHAR(255),
    order_id          VARCHAR(64) UNIQUE NOT NULL,       -- our internal order ID (EZO-{timestamp})
    cp_transaction_id VARCHAR(64),                        -- CloudPayments TransactionId
    amount            NUMERIC(10, 2) NOT NULL,
    currency          VARCHAR(3) NOT NULL DEFAULT 'RUB',
    status            VARCHAR(20) NOT NULL DEFAULT 'pending',
                      -- allowed: pending | success | failed | refunded
    description       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_payments_order_id        ON public.payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_cp_transaction  ON public.payments (cp_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id         ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status          ON public.payments (status);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION update_payments_updated_at();

-- Add status constraint
ALTER TABLE public.payments
    DROP CONSTRAINT IF EXISTS chk_payments_status;
ALTER TABLE public.payments
    ADD CONSTRAINT chk_payments_status
    CHECK (status IN ('pending', 'success', 'failed', 'refunded'));
