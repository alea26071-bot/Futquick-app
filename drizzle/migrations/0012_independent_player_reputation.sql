CREATE TABLE public.pelada_attendance (
 pelada_id uuid NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 confirmed_by uuid NOT NULL REFERENCES public.profiles(id),
 confirmed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(pelada_id,user_id)
);
GRANT SELECT ON public.pelada_attendance TO authenticated;
GRANT ALL ON public.pelada_attendance TO service_role;
ALTER TABLE public.pelada_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_read ON public.pelada_attendance FOR SELECT TO authenticated USING(true);
CREATE TABLE public.pelada_posture_ratings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 pelada_id uuid NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
 organizer_id uuid NOT NULL REFERENCES public.profiles(id),
 rated_id uuid NOT NULL REFERENCES public.profiles(id),
 score smallint NOT NULL CHECK(score BETWEEN 0 AND 100),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(pelada_id,rated_id),
 CHECK(organizer_id<>rated_id)
);
GRANT SELECT ON public.pelada_posture_ratings TO authenticated;
GRANT ALL ON public.pelada_posture_ratings TO service_role;
ALTER TABLE public.pelada_posture_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY posture_read ON public.pelada_posture_ratings FOR SELECT TO authenticated USING(true);
CREATE INDEX posture_rated_idx ON public.pelada_posture_ratings(rated_id);
CREATE INDEX stars_rated_idx ON public.pelada_ratings(rated_id);
ALTER TABLE public.profiles ADD COLUMN stars_average numeric(3,1), ADD COLUMN posture_average numeric(5,2);
ALTER TABLE public.pelada_ratings ADD COLUMN presence_verified boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profiles.rating_avg IS 'DEPRECATED: use stars_average; legacy ratings lack verified attendance.';
COMMENT ON COLUMN public.profiles.postura_score IS 'DEPRECATED: use posture_average; attendance and cancellations are not posture ratings.';
REVOKE INSERT,UPDATE,DELETE ON public.pelada_ratings FROM authenticated;
CREATE OR REPLACE FUNCTION public.game_ready_for_ratings(_pelada_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.peladas WHERE id=_pelada_id AND status<>'cancelled' AND starts_at+make_interval(mins=>duration_minutes)<=now());
$$;
CREATE OR REPLACE FUNCTION public.confirm_game_attendance(_pelada_id uuid,_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid;
BEGIN
 SELECT organizer_id INTO owner_id FROM public.peladas WHERE id=_pelada_id FOR UPDATE;
 IF auth.uid() IS NULL OR owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Somente o organizador confirma a presença'; END IF;
 IF NOT public.game_ready_for_ratings(_pelada_id) THEN RAISE EXCEPTION 'Aguarde o término do jogo'; END IF;
 IF _user_id<>owner_id AND NOT EXISTS(SELECT 1 FROM public.pelada_requests WHERE pelada_id=_pelada_id AND user_id=_user_id AND status='accepted') THEN RAISE EXCEPTION 'Jogador sem vaga confirmada'; END IF;
 INSERT INTO public.pelada_attendance(pelada_id,user_id,confirmed_by) VALUES(_pelada_id,_user_id,auth.uid()) ON CONFLICT DO NOTHING;
END; $$;
CREATE OR REPLACE FUNCTION public.submit_game_stars(_pelada_id uuid,_rated_id uuid,_score integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.peladas WHERE id=_pelada_id FOR UPDATE;
 IF auth.uid() IS NULL OR auth.uid()=_rated_id OR _score IS NULL OR _score NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Avaliação inválida'; END IF;
 IF NOT public.game_ready_for_ratings(_pelada_id) OR NOT EXISTS(SELECT 1 FROM public.pelada_attendance WHERE pelada_id=_pelada_id AND user_id=auth.uid()) OR NOT EXISTS(SELECT 1 FROM public.pelada_attendance WHERE pelada_id=_pelada_id AND user_id=_rated_id) THEN RAISE EXCEPTION 'Somente presentes neste jogo podem avaliar'; END IF;
 INSERT INTO public.pelada_ratings(pelada_id,rater_id,rated_id,score,presence_verified) VALUES(_pelada_id,auth.uid(),_rated_id,_score,true)
 ON CONFLICT(pelada_id,rater_id,rated_id) DO UPDATE SET score=EXCLUDED.score,presence_verified=true,created_at=now(),comment=null WHERE NOT pelada_ratings.presence_verified;
 IF NOT FOUND THEN RAISE EXCEPTION 'Avaliação já registrada'; END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.submit_game_posture(_pelada_id uuid,_rated_id uuid,_score integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid;
BEGIN
 SELECT organizer_id INTO owner_id FROM public.peladas WHERE id=_pelada_id FOR UPDATE;
 IF auth.uid() IS NULL OR owner_id IS DISTINCT FROM auth.uid() OR auth.uid()=_rated_id THEN RAISE EXCEPTION 'Somente o responsável avalia os demais jogadores'; END IF;
 IF _score IS NULL OR _score NOT BETWEEN 0 AND 100 OR NOT public.game_ready_for_ratings(_pelada_id) OR NOT EXISTS(SELECT 1 FROM public.pelada_attendance WHERE pelada_id=_pelada_id AND user_id=_rated_id) THEN RAISE EXCEPTION 'Postura inválida ou presença não confirmada'; END IF;
 INSERT INTO public.pelada_posture_ratings(pelada_id,organizer_id,rated_id,score) VALUES(_pelada_id,auth.uid(),_rated_id,_score);
END; $$;
CREATE OR REPLACE FUNCTION public.recompute_profile_rating() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.profiles SET stars_average=(SELECT round(avg(score),1) FROM public.pelada_ratings WHERE rated_id=COALESCE(NEW.rated_id,OLD.rated_id) AND presence_verified) WHERE id=COALESCE(NEW.rated_id,OLD.rated_id);
 RETURN NULL;
END; $$;
CREATE OR REPLACE FUNCTION public.recompute_profile_posture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.profiles SET posture_average=(SELECT avg(score) FROM public.pelada_posture_ratings WHERE rated_id=COALESCE(NEW.rated_id,OLD.rated_id)) WHERE id=COALESCE(NEW.rated_id,OLD.rated_id);
 RETURN NULL;
END; $$;
CREATE TRIGGER posture_recompute AFTER INSERT OR UPDATE OR DELETE ON public.pelada_posture_ratings FOR EACH ROW EXECUTE FUNCTION public.recompute_profile_posture();
CREATE OR REPLACE FUNCTION public.protect_reputation_averages() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user IN ('authenticated','anon') THEN
 IF TG_OP='INSERT' THEN
 IF NEW.stars_average IS NOT NULL OR NEW.posture_average IS NOT NULL OR NEW.rating_avg<>0 OR NEW.postura_score<>100 OR NEW.peladas_played<>0 THEN RAISE EXCEPTION 'Indicadores são calculados automaticamente'; END IF;
 ELSIF NEW.stars_average IS DISTINCT FROM OLD.stars_average OR NEW.posture_average IS DISTINCT FROM OLD.posture_average OR NEW.rating_avg IS DISTINCT FROM OLD.rating_avg OR NEW.postura_score IS DISTINCT FROM OLD.postura_score OR NEW.peladas_played IS DISTINCT FROM OLD.peladas_played THEN RAISE EXCEPTION 'Indicadores são calculados automaticamente'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER protect_reputation BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_reputation_averages();
CREATE OR REPLACE FUNCTION public.recompute_player_stats(_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.profiles SET peladas_played=(SELECT count(*) FROM public.pelada_attendance WHERE user_id=_user_id) WHERE id=_user_id;
END; $$;
CREATE OR REPLACE FUNCTION public.attendance_stats() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.recompute_player_stats(COALESCE(NEW.user_id,OLD.user_id)); RETURN NULL; END; $$;
CREATE TRIGGER attendance_stats AFTER INSERT OR DELETE ON public.pelada_attendance FOR EACH ROW EXECUTE FUNCTION public.attendance_stats();
CREATE OR REPLACE FUNCTION public.pending_game_ratings() RETURNS TABLE(pelada_id uuid,name text,pending_count bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.id,p.name,count(*) FROM public.pelada_attendance mine JOIN public.peladas p ON p.id=mine.pelada_id JOIN public.pelada_attendance other ON other.pelada_id=p.id AND other.user_id<>mine.user_id
 WHERE mine.user_id=auth.uid() AND public.game_ready_for_ratings(p.id) AND NOT EXISTS(SELECT 1 FROM public.pelada_ratings r WHERE r.pelada_id=p.id AND r.rater_id=mine.user_id AND r.rated_id=other.user_id AND r.presence_verified)
 GROUP BY p.id,p.name ORDER BY p.id;
$$;
REVOKE ALL ON FUNCTION public.confirm_game_attendance(uuid,uuid), public.submit_game_stars(uuid,uuid,integer), public.submit_game_posture(uuid,uuid,integer),public.pending_game_ratings(),public.game_ready_for_ratings(uuid),public.recompute_profile_posture(),public.protect_reputation_averages(),public.attendance_stats() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_game_attendance(uuid,uuid), public.submit_game_stars(uuid,uuid,integer), public.submit_game_posture(uuid,uuid,integer),public.pending_game_ratings(),public.game_ready_for_ratings(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.recompute_player_stats(uuid),public.recompute_profile_posture(),public.protect_reputation_averages(),public.attendance_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_player_stats(uuid),public.recompute_profile_posture(),public.attendance_stats() TO service_role;
UPDATE public.profiles SET peladas_played=0;
