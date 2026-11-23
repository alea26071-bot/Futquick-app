CREATE TABLE public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL CHECK (length(terms_version) BETWEEN 1 AND 20),
  privacy_version text NOT NULL CHECK (length(privacy_version) BETWEEN 1 AND 20),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, terms_version, privacy_version)
);
GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own acceptance insert" ON public.legal_acceptances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own or admin acceptance read" ON public.legal_acceptances FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.legal_acceptance_server_fields() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.id := gen_random_uuid();
  NEW.accepted_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER legal_acceptance_server_fields BEFORE INSERT ON public.legal_acceptances FOR EACH ROW EXECUTE FUNCTION public.legal_acceptance_server_fields();

CREATE OR REPLACE FUNCTION public.require_legal_acceptance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.onboarding_complete AND NOT COALESCE(OLD.onboarding_complete, false)
     AND NOT EXISTS (SELECT 1 FROM public.legal_acceptances WHERE user_id = NEW.id) THEN
    RAISE EXCEPTION 'Aceite dos Termos e da Política de Privacidade é obrigatório';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.require_legal_acceptance() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER require_legal_acceptance BEFORE UPDATE OF onboarding_complete ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.require_legal_acceptance();