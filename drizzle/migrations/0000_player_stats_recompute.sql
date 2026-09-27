-- Recompute peladas_played and postura_score for one player based on real history.
CREATE OR REPLACE FUNCTION public.recompute_player_stats(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  played INT;
  bailed INT;
  score INT;
BEGIN
  SELECT COUNT(*) INTO played
  FROM public.pelada_requests r
  JOIN public.peladas p ON p.id = r.pelada_id
  WHERE r.user_id = _user_id
    AND r.status = 'accepted'
    AND (p.status = 'finished' OR p.starts_at + (p.duration_minutes || ' minutes')::interval < now());

  SELECT COUNT(*) INTO bailed
  FROM public.pelada_requests r
  JOIN public.peladas p ON p.id = r.pelada_id
  WHERE r.user_id = _user_id
    AND r.status = 'cancelled'
    AND r.responded_at IS NOT NULL;

  IF played + bailed = 0 THEN
    score := 100;
  ELSE
    score := GREATEST(40, ROUND(100.0 * played / (played + bailed))::INT);
  END IF;

  UPDATE public.profiles
    SET peladas_played = played,
        postura_score = score
  WHERE id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pelada_requests_stats_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_player_stats(COALESCE(NEW.user_id, OLD.user_id));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_pelada_requests_stats ON public.pelada_requests;
CREATE TRIGGER trg_pelada_requests_stats
AFTER INSERT OR UPDATE OF status ON public.pelada_requests
FOR EACH ROW EXECUTE FUNCTION public.pelada_requests_stats_trigger();

-- When a pelada is marked finished, refresh stats for everyone confirmed in it.
CREATE OR REPLACE FUNCTION public.pelada_finished_stats_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.status = 'finished' AND COALESCE(OLD.status, '') <> 'finished' THEN
    FOR r IN SELECT user_id FROM public.pelada_requests
             WHERE pelada_id = NEW.id AND status = 'accepted' LOOP
      PERFORM public.recompute_player_stats(r.user_id);
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_pelada_finished_stats ON public.peladas;
CREATE TRIGGER trg_pelada_finished_stats
AFTER UPDATE OF status ON public.peladas
FOR EACH ROW EXECUTE FUNCTION public.pelada_finished_stats_trigger();

-- Backfill existing profiles once.
UPDATE public.profiles SET updated_at = updated_at WHERE FALSE;
