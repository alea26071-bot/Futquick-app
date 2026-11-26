CREATE OR REPLACE FUNCTION public.registration_is_open() RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$ SELECT false $$;
REVOKE ALL ON FUNCTION public.registration_is_open() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.registration_is_open() TO authenticated,service_role;
COMMENT ON FUNCTION public.registration_is_open() IS 'Closed pending factual minors policy and final legal review. Change only after approval; frontend legal status must match.';
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.registration_is_open() THEN RAISE EXCEPTION 'Novos cadastros estão pausados até a revisão dos Termos e da Política de Privacidade'; END IF;
 INSERT INTO public.profiles(id,name) VALUES(NEW.id,COALESCE(NEW.raw_user_meta_data->>'name',split_part(NEW.email,'@',1),'')) ON CONFLICT(id) DO NOTHING;
 RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.require_legal_acceptance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.onboarding_complete AND NOT COALESCE(OLD.onboarding_complete,false) THEN
  IF NOT public.registration_is_open() THEN RAISE EXCEPTION 'Novos cadastros estão pausados até a revisão dos Termos e da Política de Privacidade'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.legal_acceptances WHERE user_id=NEW.id AND terms_version='1.0' AND privacy_version='1.0') THEN RAISE EXCEPTION 'Aceite dos Termos e da Política de Privacidade vigentes é obrigatório'; END IF;
 END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.profile_bio_has_contact(_text text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT coalesce(_text,'') ~* '(\d[\d\s().-]{7,}\d|[a-z0-9_.+-]+@[a-z0-9.-]+\.[a-z]{2,}|(^|\s)@[a-z0-9_.]+|\m(rua|avenida|av\.|travessa|apto|apartamento|cep|cpf|rg)\s|https?://|www\.|\m(instagram|whats|zap|tiktok|telegram|insta|facebook|discord)\M)'
$$;
CREATE OR REPLACE FUNCTION public.validate_profile_private_data() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP='INSERT' OR NEW.age IS DISTINCT FROM OLD.age THEN
  IF NEW.age IS NOT NULL AND (NEW.age<13 OR NEW.age>90) THEN RAISE EXCEPTION 'Idade permitida: de 13 a 90 anos'; END IF;
  IF TG_OP='UPDATE' AND OLD.age IS NOT NULL AND NEW.age IS NULL THEN RAISE EXCEPTION 'Informe sua idade para manter as proteções do perfil'; END IF;
 END IF;
 IF TG_OP='INSERT' OR NEW.bio IS DISTINCT FROM OLD.bio OR NEW.age IS DISTINCT FROM OLD.age THEN
  IF (NEW.age IS NULL OR NEW.age<18) AND public.profile_bio_has_contact(NEW.bio) THEN RAISE EXCEPTION 'Por segurança, não publique telefone, e-mail, endereço, documentos ou contatos na biografia de adolescentes'; END IF;
 END IF;
 IF TG_OP='INSERT' OR NEW.notify_radius_km IS DISTINCT FROM OLD.notify_radius_km THEN
  IF NEW.notify_radius_km IS NOT NULL AND NEW.notify_radius_km NOT IN(2,5,10) THEN RAISE EXCEPTION 'Escolha 2 km, 5 km, 10 km ou Qualquer distância'; END IF;
 END IF;
 IF TG_OP='INSERT' OR NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude THEN
  IF (NEW.latitude IS NULL) <> (NEW.longitude IS NULL) OR NEW.latitude NOT BETWEEN -90 AND 90 OR NEW.longitude NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Localização inválida'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW.name IS DISTINCT FROM OLD.name AND length(trim(NEW.name))<2 THEN RAISE EXCEPTION 'Informe um nome com pelo menos dois caracteres'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER validate_profile_private_data BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_profile_private_data();
REVOKE SELECT(bio) ON public.profiles FROM authenticated,anon;
CREATE VIEW public.public_profiles WITH(security_barrier=true) AS SELECT id,name,username,avatar_url,cover_photo_paths,
 CASE WHEN (age IS NULL OR age<18) AND public.profile_bio_has_contact(bio) THEN NULL ELSE bio END AS bio,
 city,state,favorite_position,posture_average,stars_average,peladas_played,phone_verified,created_at
 FROM public.profiles WHERE auth.uid() IS NOT NULL AND suspended_at IS NULL AND NOT public.is_blocked(auth.uid(),id);
GRANT SELECT ON public.public_profiles TO authenticated,service_role;
REVOKE ALL ON public.public_profiles FROM anon;
CREATE OR REPLACE FUNCTION public.game_distance_km(a_lat double precision,a_lng double precision,b_lat double precision,b_lng double precision) RETURNS double precision LANGUAGE sql IMMUTABLE STRICT SET search_path=public AS $$
 SELECT CASE WHEN a_lat BETWEEN -90 AND 90 AND b_lat BETWEEN -90 AND 90 AND a_lng BETWEEN -180 AND 180 AND b_lng BETWEEN -180 AND 180 THEN 2*6371*asin(sqrt(least(1.0,greatest(0.0,power(sin(radians(b_lat-a_lat)/2),2)+cos(radians(a_lat))*cos(radians(b_lat))*power(sin(radians(b_lng-a_lng)/2),2))))) ELSE NULL END $$;
CREATE OR REPLACE FUNCTION public.game_within_radius(_radius integer,a_lat double precision,a_lng double precision,b_lat double precision,b_lng double precision) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE WHEN _radius IS NULL THEN true WHEN _radius IN(2,5,10) THEN coalesce(abs(b_lat-a_lat)<=_radius/111.0 AND public.game_distance_km(a_lat,a_lng,b_lat,b_lng)<=_radius,false) ELSE false END $$;
CREATE INDEX IF NOT EXISTS peladas_discovery_order ON public.peladas(starts_at,id) WHERE status='open';
CREATE OR REPLACE FUNCTION public.discover_peladas(_offset integer DEFAULT 0,_limit integer DEFAULT 50,_before timestamptz DEFAULT NULL,_free boolean DEFAULT false,_sports text[] DEFAULT '{}',_five_km boolean DEFAULT false) RETURNS SETOF public.peladas LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE me public.profiles%ROWTYPE; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login'; END IF;
 IF _offset<0 OR _limit<1 OR _limit>100 THEN RAISE EXCEPTION 'Página inválida'; END IF;
 SELECT * INTO me FROM public.profiles WHERE id=auth.uid() AND suspended_at IS NULL AND onboarding_complete;
 IF NOT FOUND THEN RETURN; END IF;
 RETURN QUERY SELECT p.* FROM public.peladas p WHERE p.status='open' AND p.starts_at>=now() AND (_before IS NULL OR p.starts_at<=_before) AND (NOT _free OR p.price_cents=0) AND (coalesce(cardinality(_sports),0)=0 OR p.field_type=ANY(_sports)) AND NOT public.is_blocked(me.id,p.organizer_id) AND public.game_within_radius(me.notify_radius_km,me.latitude,me.longitude,p.latitude,p.longitude) AND (NOT _five_km OR public.game_within_radius(5,me.latitude,me.longitude,p.latitude,p.longitude)) ORDER BY p.starts_at,p.id LIMIT _limit OFFSET _offset;
 END $$;
REVOKE ALL ON FUNCTION public.discover_peladas(integer,integer,timestamptz,boolean,text[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.discover_peladas(integer,integer,timestamptz,boolean,text[],boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.nearby_recipients(_pelada_id uuid,_after uuid DEFAULT NULL,_limit integer DEFAULT 500) RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT pr.id FROM public.profiles pr JOIN public.peladas p ON p.id=_pelada_id WHERE p.status='open' AND p.starts_at>now() AND pr.id<>p.organizer_id AND pr.suspended_at IS NULL AND pr.onboarding_complete AND (_after IS NULL OR pr.id>_after) AND public.game_within_radius(pr.notify_radius_km,pr.latitude,pr.longitude,p.latitude,p.longitude) AND NOT public.is_blocked(pr.id,p.organizer_id) AND NOT EXISTS(SELECT 1 FROM public.pelada_mutes m WHERE m.user_id=pr.id AND m.pelada_id=p.id) ORDER BY pr.id LIMIT greatest(1,least(_limit,500)) $$;
REVOKE ALL ON FUNCTION public.nearby_recipients(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_recipients(uuid,uuid,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.nearby_game_count(_user_id uuid) RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT count(*) FROM public.profiles pr JOIN public.peladas p ON p.status='open' AND p.starts_at>now() WHERE pr.id=_user_id AND pr.onboarding_complete AND pr.suspended_at IS NULL AND pr.id<>p.organizer_id AND public.game_within_radius(pr.notify_radius_km,pr.latitude,pr.longitude,p.latitude,p.longitude) AND NOT public.is_blocked(pr.id,p.organizer_id) AND NOT EXISTS(SELECT 1 FROM public.pelada_mutes m WHERE m.user_id=pr.id AND m.pelada_id=p.id) $$;
REVOKE ALL ON FUNCTION public.nearby_game_count(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_game_count(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.valid_member_thread(_pelada_id uuid,_organizer_id uuid,_player_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.peladas p WHERE p.id=_pelada_id AND p.organizer_id=_organizer_id AND _organizer_id<>_player_id AND public.is_pelada_member(p.id,_player_id) AND NOT public.is_blocked(_organizer_id,_player_id)) $$;
REVOKE ALL ON FUNCTION public.valid_member_thread(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.valid_member_thread(uuid,uuid,uuid) TO authenticated,service_role;
CREATE POLICY "confirmed game members only" ON public.chat_threads AS RESTRICTIVE FOR ALL TO authenticated USING(public.valid_member_thread(pelada_id,organizer_id,player_id)) WITH CHECK(public.valid_member_thread(pelada_id,organizer_id,player_id));
CREATE OR REPLACE FUNCTION public.protect_thread_membership() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.pelada_id IS DISTINCT FROM OLD.pelada_id OR NEW.organizer_id IS DISTINCT FROM OLD.organizer_id OR NEW.player_id IS DISTINCT FROM OLD.player_id THEN RAISE EXCEPTION 'Não é permitido trocar os participantes de uma conversa'; END IF; RETURN NEW; END $$;
CREATE TRIGGER protect_thread_membership BEFORE UPDATE ON public.chat_threads FOR EACH ROW EXECUTE FUNCTION public.protect_thread_membership();
CREATE OR REPLACE FUNCTION public.notify_followed_participation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE p public.peladas%ROWTYPE; who text; recipient record; nid uuid; BEGIN
 IF NEW.status<>'accepted' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF OLD.status='accepted' THEN RETURN NEW; END IF; END IF;
 SELECT * INTO p FROM public.peladas WHERE id=NEW.pelada_id;
 IF p.status NOT IN('open','full') OR p.starts_at<=now() THEN RETURN NEW; END IF;
 SELECT name INTO who FROM public.profiles WHERE id=NEW.user_id AND suspended_at IS NULL;
 IF who IS NULL THEN RETURN NEW; END IF;
 FOR recipient IN SELECT pr.* FROM public.user_follows f JOIN public.profiles pr ON pr.id=f.follower_id WHERE f.following_id=NEW.user_id AND pr.notify_follow_activity AND pr.onboarding_complete AND pr.suspended_at IS NULL AND NOT public.is_blocked(pr.id,NEW.user_id) AND NOT public.is_blocked(pr.id,p.organizer_id) AND public.game_within_radius(pr.notify_radius_km,pr.latitude,pr.longitude,p.latitude,p.longitude) LOOP
 nid:=NULL;
 INSERT INTO public.notifications(user_id,type,title,body,url,data,dedupe_key) VALUES(recipient.id,'follow_activity',who || ' entrou em um jogo próximo',p.name || ' · Participação confirmada.','/pelada/' || p.id,jsonb_build_object('peladaId',p.id,'participantId',NEW.user_id),'follow-activity:' || p.id || ':' || NEW.user_id) ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING RETURNING id INTO nid;
 IF nid IS NOT NULL THEN INSERT INTO public.social_push_queue(notification_id,pelada_id,participant_id) VALUES(nid,p.id,NEW.user_id); END IF;
 END LOOP; RETURN NEW; END $$;