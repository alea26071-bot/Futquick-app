-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  age INTEGER,
  city TEXT,
  avatar_url TEXT,
  bio TEXT,
  favorite_position TEXT,
  phone TEXT,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  postura_score INTEGER NOT NULL DEFAULT 100,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  peladas_played INTEGER NOT NULL DEFAULT 0,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ PELADAS ============
CREATE TABLE public.peladas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  total_slots INTEGER NOT NULL CHECK (total_slots > 0),
  filled_slots INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL DEFAULT 0,
  field_type TEXT NOT NULL CHECK (field_type IN ('society','campo','futsal')),
  level TEXT NOT NULL CHECK (level IN ('iniciante','intermediario','avancado')),
  photo_url TEXT,
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','cancelled','finished')),
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_peladas_starts_at ON public.peladas(starts_at);
CREATE INDEX idx_peladas_location ON public.peladas(latitude, longitude);
CREATE INDEX idx_peladas_organizer ON public.peladas(organizer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peladas TO authenticated;
GRANT ALL ON public.peladas TO service_role;
ALTER TABLE public.peladas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Peladas are viewable by authenticated users" ON public.peladas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create their own peladas" ON public.peladas FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update their peladas" ON public.peladas FOR UPDATE TO authenticated USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can delete their peladas" ON public.peladas FOR DELETE TO authenticated USING (auth.uid() = organizer_id);

-- ============ PELADA_REQUESTS ============
CREATE TABLE public.pelada_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id UUID NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(pelada_id, user_id)
);
CREATE INDEX idx_pelada_requests_pelada ON public.pelada_requests(pelada_id);
CREATE INDEX idx_pelada_requests_user ON public.pelada_requests(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pelada_requests TO authenticated;
GRANT ALL ON public.pelada_requests TO service_role;
ALTER TABLE public.pelada_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own requests or requests to peladas they organize" ON public.pelada_requests FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.peladas p WHERE p.id = pelada_id AND p.organizer_id = auth.uid())
);
CREATE POLICY "Users create their own requests" ON public.pelada_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Organizers or requesters can update requests" ON public.pelada_requests FOR UPDATE TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.peladas p WHERE p.id = pelada_id AND p.organizer_id = auth.uid())
) WITH CHECK (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.peladas p WHERE p.id = pelada_id AND p.organizer_id = auth.uid())
);

-- ============ PELADA_LIKES ============
CREATE TABLE public.pelada_likes (
  pelada_id UUID NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pelada_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.pelada_likes TO authenticated;
GRANT ALL ON public.pelada_likes TO service_role;
ALTER TABLE public.pelada_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by authenticated users" ON public.pelada_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create their own likes" ON public.pelada_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own likes" ON public.pelada_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_peladas_updated_at BEFORE UPDATE ON public.peladas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep likes_count in sync
CREATE OR REPLACE FUNCTION public.pelada_likes_count_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.peladas SET likes_count = likes_count + 1 WHERE id = NEW.pelada_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.peladas SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.pelada_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_pelada_likes_count
AFTER INSERT OR DELETE ON public.pelada_likes
FOR EACH ROW EXECUTE FUNCTION public.pelada_likes_count_trigger();

-- Keep filled_slots in sync on accepted requests
CREATE OR REPLACE FUNCTION public.pelada_slot_sync_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
      UPDATE public.peladas SET filled_slots = filled_slots + 1 WHERE id = NEW.pelada_id;
    ELSIF OLD.status = 'accepted' AND NEW.status <> 'accepted' THEN
      UPDATE public.peladas SET filled_slots = GREATEST(1, filled_slots - 1) WHERE id = NEW.pelada_id;
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    UPDATE public.peladas SET filled_slots = filled_slots + 1 WHERE id = NEW.pelada_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_pelada_slot_sync
AFTER INSERT OR UPDATE ON public.pelada_requests
FOR EACH ROW EXECUTE FUNCTION public.pelada_slot_sync_trigger();