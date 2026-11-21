CREATE OR REPLACE FUNCTION public.validate_social_acceptance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.peladas%ROWTYPE; uid uuid := auth.uid();
BEGIN
 IF TG_OP='UPDATE' AND uid IS NOT NULL THEN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.pelada_id IS DISTINCT FROM OLD.pelada_id THEN RAISE EXCEPTION 'Identidade da solicitação não pode ser alterada'; END IF;
 END IF;
 IF NEW.status <> 'accepted' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF OLD.status='accepted' THEN RETURN NEW; END IF; END IF;
 SELECT * INTO p FROM peladas WHERE id=NEW.pelada_id;
 IF uid IS NOT NULL AND uid <> p.organizer_id AND NOT has_role(uid,'admin') THEN
  IF uid <> NEW.user_id OR NOT p.auto_approve OR p.status <> 'open' OR p.starts_at <= now() OR p.filled_slots >= p.total_slots OR is_blocked(uid,p.organizer_id) THEN RAISE EXCEPTION 'Entrada não autorizada'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS social_validate_acceptance ON public.pelada_requests;
CREATE TRIGGER social_validate_acceptance BEFORE INSERT OR UPDATE ON public.pelada_requests FOR EACH ROW EXECUTE FUNCTION public.validate_social_acceptance();
REVOKE ALL ON FUNCTION public.validate_social_acceptance() FROM PUBLIC,anon,authenticated;