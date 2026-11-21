ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_follow_activity boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS user_follows_following_created_idx ON public.user_follows(following_id, created_at DESC, follower_id);
DROP POLICY IF EXISTS "Users create their own follows" ON public.user_follows;
CREATE POLICY "Users create their own follows" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id AND NOT public.is_blocked(follower_id, following_id) AND EXISTS (SELECT 1 FROM public.profiles WHERE id = following_id AND suspended_at IS NULL));

CREATE OR REPLACE FUNCTION public.social_profile_list(_profile_id uuid, _mode text, _search text DEFAULT '', _offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Faça login'; END IF;
 IF _mode NOT IN ('followers','following','mutual') OR _offset < 0 OR length(_search) > 80 THEN RAISE EXCEPTION 'Consulta inválida'; END IF;
 IF NOT EXISTS (SELECT 1 FROM profiles WHERE id=_profile_id AND suspended_at IS NULL AND NOT is_blocked(uid,id)) THEN RAISE EXCEPTION 'Perfil indisponível'; END IF;
 WITH candidates AS (
 SELECT p.id,p.name,p.username,p.avatar_url,f.created_at,
 EXISTS(SELECT 1 FROM user_follows me WHERE me.follower_id=uid AND me.following_id=p.id) AS following
 FROM user_follows f JOIN profiles p ON p.id = CASE WHEN _mode='following' THEN f.following_id ELSE f.follower_id END
 WHERE CASE WHEN _mode='following' THEN f.follower_id=_profile_id ELSE f.following_id=_profile_id END
 AND p.suspended_at IS NULL AND NOT is_blocked(uid,p.id) AND NOT is_blocked(_profile_id,p.id)
 AND (_mode <> 'mutual' OR EXISTS(SELECT 1 FROM user_follows me WHERE me.follower_id=uid AND me.following_id=p.id))
 AND (position(lower(trim(_search)) in lower(p.name))>0 OR position(lower(trim(_search)) in lower(coalesce(p.username,'')))>0)
 ), page AS (SELECT * FROM candidates ORDER BY created_at DESC,id LIMIT 20 OFFSET _offset)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM candidates),'items',coalesce((SELECT jsonb_agg(to_jsonb(page)-'created_at') FROM page),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.social_profile_list(uuid,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.social_profile_list(uuid,text,text,integer) TO authenticated;

CREATE TABLE public.social_push_queue (
 notification_id uuid PRIMARY KEY REFERENCES public.notifications(id) ON DELETE CASCADE,
 pelada_id uuid NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
 participant_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','done')),
 attempts integer NOT NULL DEFAULT 0,
 claimed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.social_push_queue TO service_role;
ALTER TABLE public.social_push_queue ENABLE ROW LEVEL SECURITY;
CREATE INDEX social_push_queue_pending_idx ON public.social_push_queue(state,created_at);

CREATE OR REPLACE FUNCTION public.validate_social_acceptance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.peladas%ROWTYPE; uid uuid := auth.uid();
BEGIN
 IF NEW.status <> 'accepted' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF OLD.status='accepted' THEN RETURN NEW; END IF; END IF;
 SELECT * INTO p FROM peladas WHERE id=NEW.pelada_id;
 IF uid IS NOT NULL AND uid <> p.organizer_id AND NOT has_role(uid,'admin') THEN
  IF uid <> NEW.user_id OR NOT p.auto_approve OR p.status <> 'open' OR p.starts_at <= now() OR p.filled_slots >= p.total_slots OR is_blocked(uid,p.organizer_id) THEN RAISE EXCEPTION 'Entrada não autorizada'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER social_validate_acceptance BEFORE INSERT OR UPDATE OF status ON public.pelada_requests FOR EACH ROW EXECUTE FUNCTION public.validate_social_acceptance();

CREATE OR REPLACE FUNCTION public.notify_followed_participation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.peladas%ROWTYPE; who text; recipient record; nid uuid; distance double precision;
BEGIN
 IF NEW.status <> 'accepted' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF OLD.status='accepted' THEN RETURN NEW; END IF; END IF;
 SELECT * INTO p FROM peladas WHERE id=NEW.pelada_id;
 IF p.status NOT IN ('open','full') OR p.starts_at <= now() OR p.latitude IS NULL OR p.longitude IS NULL THEN RETURN NEW; END IF;
 SELECT name INTO who FROM profiles WHERE id=NEW.user_id AND suspended_at IS NULL;
 IF who IS NULL THEN RETURN NEW; END IF;
 FOR recipient IN SELECT pr.id,pr.latitude,pr.longitude,pr.notify_radius_km FROM user_follows f JOIN profiles pr ON pr.id=f.follower_id
 WHERE f.following_id=NEW.user_id AND pr.notify_follow_activity AND pr.suspended_at IS NULL AND pr.latitude IS NOT NULL AND pr.longitude IS NOT NULL AND NOT is_blocked(pr.id,NEW.user_id) AND NOT is_blocked(pr.id,p.organizer_id)
 LOOP
  distance := 2*6371*asin(sqrt(least(1.0,power(sin(radians(p.latitude-recipient.latitude)/2),2)+cos(radians(recipient.latitude))*cos(radians(p.latitude))*power(sin(radians(p.longitude-recipient.longitude)/2),2))));
  IF distance <= least(coalesce(recipient.notify_radius_km,5),5) THEN
   nid := NULL;
   INSERT INTO notifications(user_id,type,title,body,url,data,dedupe_key)
   VALUES(recipient.id,'follow_activity',who || ' entrou em um jogo próximo',p.name || ' · Participação confirmada.','/pelada/' || p.id,jsonb_build_object('peladaId',p.id,'participantId',NEW.user_id),'follow-activity:' || p.id || ':' || NEW.user_id)
   ON CONFLICT (user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING RETURNING id INTO nid;
   IF nid IS NOT NULL THEN INSERT INTO social_push_queue(notification_id,pelada_id,participant_id) VALUES(nid,p.id,NEW.user_id); END IF;
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER social_followed_participation AFTER INSERT OR UPDATE OF status ON public.pelada_requests FOR EACH ROW EXECUTE FUNCTION public.notify_followed_participation();
REVOKE ALL ON FUNCTION public.notify_followed_participation() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.validate_social_acceptance() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.claim_social_push(_pelada_id uuid DEFAULT NULL) RETURNS SETOF public.social_push_queue LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE social_push_queue q SET state='processing',claimed_at=now(),attempts=q.attempts+1
 WHERE q.notification_id IN (SELECT notification_id FROM social_push_queue WHERE (_pelada_id IS NULL OR pelada_id=_pelada_id) AND (state='pending' OR (state='processing' AND claimed_at < now()-interval '10 minutes')) ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED)
 RETURNING q.*;
$$;
REVOKE ALL ON FUNCTION public.claim_social_push(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_social_push(uuid) TO service_role;