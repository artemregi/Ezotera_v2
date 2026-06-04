-- Add role column to users table for admin access
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Create index on role for faster admin queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
