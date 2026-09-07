-- Migration 011: normalize legacy focus_area values.
-- onboarding/complete.js used to store a JS array which PG serialized as {"career","love"};
-- register-from-onboarding.js stores CSV "career,love". Normalize existing rows to CSV.

UPDATE public.users
SET focus_area = replace(replace(replace(focus_area, '{', ''), '}', ''), '"', '')
WHERE focus_area LIKE '{%}';
