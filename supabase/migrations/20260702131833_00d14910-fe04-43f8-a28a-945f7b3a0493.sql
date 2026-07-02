
-- Storage RLS policies for avatars and peladas buckets (private, but users own folders)

CREATE POLICY "Users read their own avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read all avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload their own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update their own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete their own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone authenticated reads pelada photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'peladas');

CREATE POLICY "Users upload their own pelada photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'peladas' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update their own pelada photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'peladas' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete their own pelada photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'peladas' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Theme preference on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_preference TEXT NOT NULL DEFAULT 'dark'
    CHECK (theme_preference IN ('light', 'dark', 'system'));

-- Post-match ratings table
CREATE TABLE public.pelada_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id UUID NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pelada_id, rater_id, rated_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pelada_ratings TO authenticated;
GRANT ALL ON public.pelada_ratings TO service_role;

ALTER TABLE public.pelada_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads ratings" ON public.pelada_ratings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users rate participants of peladas they joined" ON public.pelada_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = rater_id
    AND rater_id <> rated_id
    AND EXISTS (
      SELECT 1 FROM public.peladas p
      WHERE p.id = pelada_id AND p.starts_at < now()
    )
    AND (
      -- rater is organizer or accepted participant
      EXISTS (SELECT 1 FROM public.peladas p WHERE p.id = pelada_id AND p.organizer_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.pelada_requests r
                 WHERE r.pelada_id = pelada_id AND r.user_id = auth.uid() AND r.status = 'accepted')
    )
    AND (
      -- rated must be organizer or accepted participant
      EXISTS (SELECT 1 FROM public.peladas p WHERE p.id = pelada_id AND p.organizer_id = rated_id)
      OR EXISTS (SELECT 1 FROM public.pelada_requests r
                 WHERE r.pelada_id = pelada_id AND r.user_id = rated_id AND r.status = 'accepted')
    )
  );

CREATE POLICY "Users update their own ratings" ON public.pelada_ratings
  FOR UPDATE TO authenticated
  USING (auth.uid() = rater_id) WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users delete their own ratings" ON public.pelada_ratings
  FOR DELETE TO authenticated
  USING (auth.uid() = rater_id);

-- Recompute rating_avg on profiles when ratings change
CREATE OR REPLACE FUNCTION public.recompute_profile_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target UUID;
BEGIN
  target := COALESCE(NEW.rated_id, OLD.rated_id);
  UPDATE public.profiles
    SET rating_avg = COALESCE((
      SELECT AVG(score)::NUMERIC(3,2) FROM public.pelada_ratings WHERE rated_id = target
    ), NULL)
    WHERE id = target;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS pelada_ratings_recompute ON public.pelada_ratings;
CREATE TRIGGER pelada_ratings_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.pelada_ratings
FOR EACH ROW EXECUTE FUNCTION public.recompute_profile_rating();
