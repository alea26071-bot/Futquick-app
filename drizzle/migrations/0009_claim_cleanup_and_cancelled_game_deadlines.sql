ALTER TABLE public.peladas ADD COLUMN IF NOT EXISTS chat_cleanup_started_at timestamptz;
CREATE OR REPLACE FUNCTION public.is_group_open(_pelada_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.peladas p WHERE p.id = _pelada_id AND p.chat_purged_at IS NULL AND p.chat_cleanup_started_at IS NULL AND now() >= p.starts_at - interval '24 hours' AND now() < p.starts_at + make_interval(mins => p.duration_minutes) + interval '24 hours') $$;
CREATE OR REPLACE FUNCTION public.claim_expired_conversation(_pelada_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE public.peladas SET chat_cleanup_started_at = COALESCE(chat_cleanup_started_at,now()) WHERE id = _pelada_id AND chat_purged_at IS NULL AND starts_at + make_interval(mins => duration_minutes) + interval '24 hours' <= now();
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_expired_conversation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_expired_conversation(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.purge_expired_conversation(_pelada_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE game public.peladas%ROWTYPE;
BEGIN
 SELECT * INTO game FROM public.peladas WHERE id = _pelada_id FOR UPDATE;
 IF NOT FOUND OR game.chat_purged_at IS NOT NULL OR game.chat_cleanup_started_at IS NULL OR now() < game.starts_at + make_interval(mins => game.duration_minutes) + interval '24 hours' THEN RETURN false; END IF;
 DELETE FROM public.notifications WHERE url IN (SELECT '/chat/' || id::text FROM public.chat_threads WHERE pelada_id=game.id) OR url = '/grupo/' || game.id::text;
 DELETE FROM public.chat_threads WHERE pelada_id = game.id;
 DELETE FROM public.pelada_group_messages WHERE pelada_id = game.id;
 DELETE FROM public.pelada_mutes WHERE pelada_id = game.id;
 UPDATE public.peladas SET chat_purged_at = now() WHERE id = game.id;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.can_read_chat_object(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.pelada_group_messages m WHERE split_part(m.attachment_url,'?',1) LIKE '%/chat/' || _path AND public.is_group_open(m.pelada_id) AND public.is_pelada_member(m.pelada_id,auth.uid()))
 OR EXISTS (SELECT 1 FROM public.chat_messages m JOIN public.chat_threads t ON t.id=m.thread_id WHERE split_part(m.attachment_url,'?',1) LIKE '%/chat/' || _path AND public.is_group_open(t.pelada_id) AND auth.uid() IN (t.organizer_id,t.player_id))
 OR (_path LIKE auth.uid()::text || '/grupo-%' AND EXISTS (SELECT 1 FROM public.peladas p WHERE _path LIKE auth.uid()::text || '/grupo-' || p.id::text || '-%' AND public.is_group_open(p.id) AND public.is_pelada_member(p.id,auth.uid())))
$$;
CREATE POLICY "chat object conversation access" ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (bucket_id <> 'chat' OR public.can_read_chat_object(name));
CREATE POLICY "chat upload conversation access" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (bucket_id <> 'chat' OR public.can_read_chat_object(name));
CREATE OR REPLACE FUNCTION public.prevent_cleaned_conversation_reschedule() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF OLD.chat_cleanup_started_at IS NOT NULL AND (NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes OR NEW.chat_cleanup_started_at IS DISTINCT FROM OLD.chat_cleanup_started_at) THEN RAISE EXCEPTION 'Conversa já expirada; crie uma nova ocorrência para renovar o jogo'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_conversation_cleanup BEFORE UPDATE ON public.peladas FOR EACH ROW EXECUTE FUNCTION public.prevent_cleaned_conversation_reschedule();