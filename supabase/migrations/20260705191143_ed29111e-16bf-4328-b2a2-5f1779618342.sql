
-- Ensure phone is stored digits-only and unique across profiles.
UPDATE public.profiles SET phone = regexp_replace(phone, '\D', '', 'g') WHERE phone IS NOT NULL;
UPDATE public.profiles SET phone = NULL WHERE phone IS NOT NULL AND length(phone) < 10;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON public.profiles (phone) WHERE phone IS NOT NULL;
