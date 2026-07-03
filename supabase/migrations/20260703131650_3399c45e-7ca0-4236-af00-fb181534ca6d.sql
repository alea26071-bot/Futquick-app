
-- Chat threads (1-1 organizer ↔ jogador por pelada)
CREATE TABLE public.chat_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pelada_id UUID NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pelada_id, organizer_id, player_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their thread" ON public.chat_threads
  FOR SELECT TO authenticated
  USING (auth.uid() = organizer_id OR auth.uid() = player_id);
CREATE POLICY "Players can create threads with organizers" ON public.chat_threads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id OR auth.uid() = organizer_id);
CREATE POLICY "Participants can update their thread" ON public.chat_threads
  FOR UPDATE TO authenticated
  USING (auth.uid() = organizer_id OR auth.uid() = player_id)
  WITH CHECK (auth.uid() = organizer_id OR auth.uid() = player_id);

CREATE INDEX idx_chat_threads_organizer ON public.chat_threads(organizer_id, last_message_at DESC);
CREATE INDEX idx_chat_threads_player ON public.chat_threads(player_id, last_message_at DESC);

CREATE TRIGGER trg_chat_threads_updated_at BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id = thread_id AND (t.organizer_id = auth.uid() OR t.player_id = auth.uid())
  ));
CREATE POLICY "Participants can send messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id AND (t.organizer_id = auth.uid() OR t.player_id = auth.uid())
    )
  );

CREATE INDEX idx_chat_messages_thread ON public.chat_messages(thread_id, created_at);

-- Trigger to bump thread's last_message_at + last_message
CREATE OR REPLACE FUNCTION public.chat_touch_thread()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.chat_threads
    SET last_message_at = NEW.created_at, last_message = NEW.body, updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_chat_touch_thread AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_touch_thread();

-- Enable realtime on chat_messages and chat_threads
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
