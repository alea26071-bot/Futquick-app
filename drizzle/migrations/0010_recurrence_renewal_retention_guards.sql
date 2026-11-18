CREATE OR REPLACE FUNCTION public.mark_recurring_occurrence() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.template_id IS NOT NULL THEN NEW.was_recurring := true; IF NEW.starts_at + make_interval(mins => NEW.duration_minutes) > now() THEN UPDATE public.pelada_templates SET active=true WHERE id=NEW.template_id AND organizer_id=NEW.organizer_id; END IF; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.prune_inactive_templates() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; candidate record; excess integer; removed integer := 0;
BEGIN
 IF NOT pg_try_advisory_xact_lock(68173420) THEN RETURN 0; END IF;
 FOR owner_id IN SELECT DISTINCT organizer_id FROM public.pelada_templates LOOP
  SELECT greatest(count(*)::integer - 10, 0) INTO excess FROM public.pelada_templates WHERE organizer_id=owner_id;
  FOR candidate IN SELECT t.id FROM public.pelada_templates t WHERE t.organizer_id=owner_id AND NOT t.active AND NOT EXISTS (SELECT 1 FROM public.peladas p WHERE p.template_id=t.id AND p.starts_at + make_interval(mins=>p.duration_minutes) >= now()) ORDER BY t.created_at ASC,t.id ASC FOR UPDATE OF t LOOP
   EXIT WHEN excess<=0;
   DELETE FROM public.pelada_templates WHERE id=candidate.id AND NOT active;
   IF FOUND THEN removed:=removed+1; excess:=excess-1; END IF;
  END LOOP;
 END LOOP;
 RETURN removed;
END $$;