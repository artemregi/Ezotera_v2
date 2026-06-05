-- Add secret token for referral partner stats page access
ALTER TABLE public.referral_links ADD COLUMN IF NOT EXISTS secret_token VARCHAR(64) UNIQUE;
