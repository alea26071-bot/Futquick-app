ALTER TABLE public.peladas ADD COLUMN IF NOT EXISTS group_mode text NOT NULL DEFAULT 'temporary';
ALTER TABLE public.peladas ADD CONSTRAINT peladas_group_mode_chk CHECK (group_mode IN ('temporary','permanent'));

CREATE OR REPLACE FUNCTION public.max_slots_for(_field text) RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE _field WHEN 'campo' THEN 30 WHEN 'society' THEN 21 WHEN 'futsal' THEN 16 ELSE 30 END $$;

CREATE OR REPLACE FUNCTION public.validate_slots_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.total_slots > public.max_slots_for(NEW.field_type) THEN
    RAISE EXCEPTION 'Limite de % participantes para %', public.max_slots_for(NEW.field_type), NEW.field_type;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_peladas_validate_slots BEFORE INSERT OR UPDATE OF total_slots, field_type ON public.peladas
  FOR EACH ROW EXECUTE FUNCTION public.validate_slots_trigger();
CREATE TRIGGER trg_templates_validate_slots BEFORE INSERT OR UPDATE OF total_slots, field_type ON public.pelada_templates
  FOR EACH ROW EXECUTE FUNCTION public.validate_slots_trigger();

CREATE OR REPLACE FUNCTION public.limit_templates_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.pelada_templates WHERE organizer_id = NEW.organizer_id) >= 5 THEN
    RAISE EXCEPTION 'Você pode ter no máximo 5 peladas fixas';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_limit_templates BEFORE INSERT ON public.pelada_templates
  FOR EACH ROW EXECUTE FUNCTION public.limit_templates_trigger();

-- Group closes for temporary peladas once the match ends (or when finished)
CREATE OR REPLACE FUNCTION public.is_group_open(_pelada_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.peladas p WHERE p.id = _pelada_id AND (
    (p.group_mode = 'permanent' AND p.status <> 'finished') OR
    (p.group_mode = 'temporary' AND p.status <> 'finished' AND p.starts_at + (p.duration_minutes || ' minutes')::interval > now())
  )) $$;
GRANT EXECUTE ON FUNCTION public.is_group_open(uuid) TO authenticated;

CREATE POLICY "Group must be open to send" ON public.pelada_group_messages AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_group_open(pelada_id));

-- Retention + fixed-pelada confirmation reset
CREATE OR REPLACE FUNCTION public.pelada_group_maintenance() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.pelada_group_messages m USING public.peladas p
  WHERE m.pelada_id = p.id AND m.created_at < now() - CASE WHEN p.template_id IS NOT NULL THEN interval '7 days' ELSE interval '24 hours' END;

  UPDATE public.pelada_requests r SET status = 'cancelled', responded_at = NULL
  FROM public.peladas p
  WHERE r.pelada_id = p.id AND p.template_id IS NOT NULL AND r.status IN ('accepted','pending','waitlist')
    AND p.starts_at + (p.duration_minutes || ' minutes')::interval + interval '24 hours' < now();
END; $$;
REVOKE ALL ON FUNCTION public.pelada_group_maintenance() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('pelada-group-maintenance', '15 * * * *', 'SELECT public.pelada_group_maintenance()');