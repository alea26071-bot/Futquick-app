ALTER TABLE public.profiles ADD COLUMN cover_photo_paths text[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION public.validate_profile_cover_photos()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE photo_path text;
BEGIN
  IF cardinality(NEW.cover_photo_paths) > 3 THEN
    RAISE EXCEPTION 'Você pode adicionar até 3 fotos de capa';
  END IF;
  IF cardinality(NEW.cover_photo_paths) <> (SELECT count(DISTINCT p) FROM unnest(NEW.cover_photo_paths) p) THEN
    RAISE EXCEPTION 'As fotos de capa devem ser diferentes';
  END IF;
  FOREACH photo_path IN ARRAY NEW.cover_photo_paths LOOP
    IF photo_path IS NULL OR photo_path NOT LIKE NEW.id::text || '/cover-%' OR photo_path LIKE '%..%' THEN
      RAISE EXCEPTION 'Foto de capa inválida';
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_profile_cover_photos BEFORE INSERT OR UPDATE OF cover_photo_paths ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_profile_cover_photos();