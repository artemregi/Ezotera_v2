-- Referral links for tracking payments by source
CREATE TABLE IF NOT EXISTS public.referral_links (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_links_code ON public.referral_links(code);

-- Add referral_code to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS referral_code VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_payments_referral ON public.payments(referral_code);
