-- Add password reset OTP fields to users table
-- Allows secure password reset via 6-digit OTP

-- Add columns if they don't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS reset_otp_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reset_otp_used BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_reset_otp_email
ON public.users(email)
WHERE reset_otp_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_reset_otp_expires
ON public.users(reset_otp_expires_at)
WHERE reset_otp_hash IS NOT NULL;

-- Add column comments for documentation
COMMENT ON COLUMN public.users.reset_otp_hash IS 'SHA-256 hash of the 6-digit OTP (never store raw OTP)';
COMMENT ON COLUMN public.users.reset_otp_expires_at IS 'Timestamp when OTP expires (typically 10 minutes after generation)';
COMMENT ON COLUMN public.users.reset_otp_used IS 'Whether this OTP has been used for password reset (prevents reuse)';

-- Add table comment if not exists
COMMENT ON TABLE public.users IS 'User accounts with authentication, onboarding data, and password reset OTP support for Ezoterra astrology platform';
