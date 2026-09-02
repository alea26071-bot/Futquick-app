CREATE TABLE public.live_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_locations TO authenticated;
GRANT ALL ON public.live_locations TO service_role;

ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread participants can view live locations"
ON public.live_locations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.chat_threads t
  WHERE t.id = live_locations.thread_id
    AND (t.organizer_id = auth.uid() OR t.player_id = auth.uid())
));

CREATE POLICY "Users can share their own live location"
ON public.live_locations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.chat_threads t
  WHERE t.id = live_locations.thread_id
    AND (t.organizer_id = auth.uid() OR t.player_id = auth.uid())
));

CREATE POLICY "Users can update their own live location"
ON public.live_locations FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can stop their own live location"
ON public.live_locations FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER live_locations_updated_at
BEFORE UPDATE ON public.live_locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.live_locations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;