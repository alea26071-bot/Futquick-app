CREATE TABLE public.user_follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see follows involving them" ON public.user_follows
  FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users create their own follows" ON public.user_follows
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users remove their own follows" ON public.user_follows
  FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE public.profiles
SET username = regexp_replace(lower(coalesce(nullif(name, ''), 'jogador')), '[^a-z0-9]', '', 'g') || substr(replace(id::text, '-', ''), 1, 4)
WHERE username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(lower(username));

CREATE POLICY "Confirmed players are visible to authenticated users" ON public.pelada_requests
  FOR SELECT TO authenticated
  USING (status = 'accepted');