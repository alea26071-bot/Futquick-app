ALTER TABLE public.peladas ADD COLUMN IF NOT EXISTS chat_purged_at timestamptz;
ALTER TABLE public.peladas ADD COLUMN IF NOT EXISTS was_recurring boolean NOT NULL DEFAULT false;
UPDATE public.peladas SET was_recurring = true WHERE template_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.is_group_open(_pelada_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.peladas p WHERE p.id = _pelada_id AND p.chat_purged_at IS NULL AND now() >= p.starts_at - interval '24 hours' AND now() < p.starts_at + make_interval(mins => p.duration_minutes) + interval '24 hours')
$$;
CREATE POLICY "conversation window group" ON public.pelada_group_messages AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_group_open(pelada_id)) WITH CHECK (public.is_group_open(pelada_id));
CREATE POLICY "conversation window threads" ON public.chat_threads AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_group_open(pelada_id)) WITH CHECK (public.is_group_open(pelada_id));
CREATE OR REPLACE FUNCTION public.is_thread_open(_thread_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = _thread_id AND public.is_group_open(t.pelada_id)) $$;
CREATE POLICY "conversation window messages" ON public.chat_messages AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_thread_open(thread_id)) WITH CHECK (public.is_thread_open(thread_id));
CREATE POLICY "conversation window locations" ON public.live_locations AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_thread_open(thread_id)) WITH CHECK (public.is_thread_open(thread_id));
CREATE OR REPLACE FUNCTION public.limit_templates_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN RETURN NEW; END $$;
COMMENT ON FUNCTION public.limit_templates_trigger() IS 'Legacy five-template cap retired: all active recurrences must be preserved.';
CREATE OR REPLACE FUNCTION public.mark_recurring_occurrence() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF NEW.template_id IS NOT NULL THEN NEW.was_recurring := true; END IF; RETURN NEW; END $$;
CREATE TRIGGER mark_recurring_occurrence BEFORE INSERT OR UPDATE OF template_id ON public.peladas FOR EACH ROW EXECUTE FUNCTION public.mark_recurring_occurrence();
CREATE OR REPLACE FUNCTION public.prune_inactive_templates() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; candidate record; excess integer; removed integer := 0;
BEGIN
 IF NOT pg_try_advisory_xact_lock(68173420) THEN RETURN 0; END IF;
 FOR owner_id IN SELECT DISTINCT organizer_id FROM public.pelada_templates LOOP
  SELECT greatest(count(*)::integer - 10, 0) INTO excess FROM public.pelada_templates WHERE organizer_id = owner_id;
  FOR candidate IN SELECT t.id FROM public.pelada_templates t WHERE t.organizer_id = owner_id AND NOT t.active
    AND NOT EXISTS (SELECT 1 FROM public.peladas p WHERE p.template_id = t.id AND (p.starts_at + make_interval(mins => p.duration_minutes) >= now() OR p.status NOT IN ('finished','cancelled')))
    ORDER BY t.created_at ASC, t.id ASC FOR UPDATE OF t LOOP
   EXIT WHEN excess <= 0;
   DELETE FROM public.pelada_templates WHERE id = candidate.id AND NOT active;
   IF FOUND THEN removed := removed + 1; excess := excess - 1; END IF;
  END LOOP;
 END LOOP;
 RETURN removed;
END $$;
REVOKE ALL ON FUNCTION public.prune_inactive_templates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_inactive_templates() TO service_role;
CREATE OR REPLACE FUNCTION public.purge_expired_conversation(_pelada_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE game public.peladas%ROWTYPE;
BEGIN
 SELECT * INTO game FROM public.peladas WHERE id = _pelada_id FOR UPDATE;
 IF NOT FOUND OR game.chat_purged_at IS NOT NULL OR game.status = 'cancelled' OR now() < game.starts_at + make_interval(mins => game.duration_minutes) + interval '24 hours' THEN RETURN false; END IF;
 DELETE FROM public.chat_threads WHERE pelada_id = game.id;
 DELETE FROM public.pelada_group_messages WHERE pelada_id = game.id;
 DELETE FROM public.pelada_mutes WHERE pelada_id = game.id;
 DELETE FROM public.notifications WHERE url = '/grupo/' || game.id::text OR (type = 'chat_message' AND data->>'peladaId' = game.id::text);
 UPDATE public.peladas SET chat_purged_at = now() WHERE id = game.id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.purge_expired_conversation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_conversation(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.pelada_group_maintenance() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
 UPDATE public.pelada_requests r SET status = 'cancelled' FROM public.peladas p WHERE r.pelada_id = p.id AND p.template_id IS NOT NULL AND r.status IN ('pending','waitlist') AND p.starts_at + make_interval(mins => p.duration_minutes) + interval '24 hours' < now();
END $$;
REVOKE ALL ON FUNCTION public.pelada_group_maintenance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pelada_group_maintenance() TO service_role;
CREATE INDEX IF NOT EXISTS peladas_conversation_expiry_idx ON public.peladas(starts_at) WHERE chat_purged_at IS NULL;
CREATE INDEX IF NOT EXISTS templates_retention_idx ON public.pelada_templates(organizer_id, created_at) WHERE NOT active;