-- Add customer_name to payments for Telegram notifications
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
-- Add product_id reference
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS product_id INTEGER;
