ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_location_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_min_age_13 CHECK (age IS NULL OR age >= 13) NOT VALID;

REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, name, city, state, avatar_url, bio, favorite_position, phone_verified, postura_score, rating_avg, peladas_played, onboarding_complete, created_at, updated_at, theme_preference, username, suspended_at, game_term, cover_photo_paths, stars_average, posture_average) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.profiles WHERE id = auth.uid() $$;
REVOKE ALL ON FUNCTION public.my_profile() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_profile() TO authenticated;
COMMENT ON COLUMN public.profiles.background_location_enabled IS 'Opt-in for low-frequency background location used only for nearby game notifications; native implementation pending.';