-- Контакт и адрес доставки для заказов физических товаров (браслеты)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(32);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS delivery_address TEXT;
