-- ATENÇÃO: ao mudar TERMS_VERSION/PRIVACY_VERSION em src/lib/legal.ts, atualize este par de versões em nova migration.
CREATE OR REPLACE FUNCTION public.require_legal_acceptance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.onboarding_complete AND NOT COALESCE(OLD.onboarding_complete, false)
     AND NOT EXISTS (
       SELECT 1 FROM public.legal_acceptances
       WHERE user_id = NEW.id AND terms_version = '1.0' AND privacy_version = '1.0'
     ) THEN
    RAISE EXCEPTION 'Aceite dos Termos e da Política de Privacidade vigentes é obrigatório';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.require_legal_acceptance() FROM PUBLIC, anon, authenticated;