-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX notifications_dedupe_uidx ON public.notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- PUSH SUBSCRIPTIONS
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CHAT MESSAGE TYPES + READ RECEIPTS
ALTER TABLE public.chat_messages
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN attachment_url TEXT,
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION,
  ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_kind_check CHECK (kind IN ('text','image','location'));
CREATE POLICY "Participants can mark received messages read" ON public.chat_messages FOR UPDATE TO authenticated
USING (sender_id <> auth.uid() AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = chat_messages.thread_id AND (t.organizer_id = auth.uid() OR t.player_id = auth.uid())))
WITH CHECK (sender_id <> auth.uid() AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = chat_messages.thread_id AND (t.organizer_id = auth.uid() OR t.player_id = auth.uid())));
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- POST-MATCH RATING REMINDER TRACKING
ALTER TABLE public.peladas ADD COLUMN rating_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- CHAT ATTACHMENT STORAGE POLICIES
CREATE POLICY "Chat participants upload their own attachments" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "Authenticated users read chat attachments" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat');
CREATE POLICY "Users delete their own chat attachments" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat' AND (storage.foldername(name))[1] = (auth.uid())::text);