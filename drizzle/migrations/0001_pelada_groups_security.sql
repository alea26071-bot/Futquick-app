ALTER TABLE public.pelada_requests DROP CONSTRAINT pelada_requests_status_check;
ALTER TABLE public.pelada_requests ADD CONSTRAINT pelada_requests_status_check
  CHECK (status = ANY (ARRAY['pending','accepted','rejected','cancelled','removed','waitlist']));

ALTER TABLE public.peladas ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- Membership helper
CREATE OR REPLACE FUNCTION public.is_pelada_member(_pelada_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.peladas WHERE id = _pelada_id AND organizer_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.pelada_requests WHERE pelada_id = _pelada_id AND user_id = _user_id AND status = 'accepted')
$$;

CREATE OR REPLACE FUNCTION public.is_pelada_organizer(_pelada_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.peladas WHERE id = _pelada_id AND organizer_id = _user_id)
$$;

-- Blocks
CREATE TABLE public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own blocks read" ON public.user_blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "own blocks insert" ON public.user_blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "own blocks delete" ON public.user_blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_blocked(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a))
$$;

-- Block direct chat
CREATE POLICY "no messages between blocked users" ON public.chat_messages AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT EXISTS (
    SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id
      AND public.is_blocked(t.organizer_id, t.player_id)));

-- Group messages
CREATE TABLE public.pelada_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id uuid NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','image','location','system')),
  body text NOT NULL DEFAULT '',
  attachment_url text,
  latitude double precision,
  longitude double precision,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pelada_group_messages (pelada_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.pelada_group_messages TO authenticated;
GRANT ALL ON public.pelada_group_messages TO service_role;
ALTER TABLE public.pelada_group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read group" ON public.pelada_group_messages FOR SELECT TO authenticated
  USING (public.is_pelada_member(pelada_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "members send group" ON public.pelada_group_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND kind <> 'system' AND deleted_at IS NULL
    AND public.is_pelada_member(pelada_id, auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND suspended_at IS NOT NULL));
CREATE POLICY "moderate group" ON public.pelada_group_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR public.is_pelada_organizer(pelada_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (sender_id = auth.uid() OR public.is_pelada_organizer(pelada_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.pelada_group_messages;

-- Mutes
CREATE TABLE public.pelada_mutes (
  pelada_id uuid NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pelada_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.pelada_mutes TO authenticated;
GRANT ALL ON public.pelada_mutes TO service_role;
ALTER TABLE public.pelada_mutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mutes" ON public.pelada_mutes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('pelada','user','message')),
  pelada_id uuid REFERENCES public.peladas(id) ON DELETE SET NULL,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message_id uuid,
  message_source text CHECK (message_source IN ('group','direct')),
  message_body text,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "create own report" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND status = 'open' AND reviewed_by IS NULL);
CREATE POLICY "read own or admin" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates" ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Join / leave / manage
CREATE OR REPLACE FUNCTION public.join_pelada(_pelada_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.peladas%ROWTYPE;
  existing public.pelada_requests%ROWTYPE;
  uid uuid := auth.uid();
  new_status text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Faça login'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = uid AND suspended_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Sua conta está suspensa'; END IF;
  SELECT * INTO p FROM peladas WHERE id = _pelada_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pelada não encontrada'; END IF;
  IF p.organizer_id = uid THEN RAISE EXCEPTION 'Você organiza esta pelada'; END IF;
  IF p.status <> 'open' OR p.starts_at < now() THEN RAISE EXCEPTION 'Esta pelada não está aceitando jogadores'; END IF;
  IF public.is_blocked(uid, p.organizer_id) THEN RAISE EXCEPTION 'Não é possível entrar nesta pelada'; END IF;

  SELECT * INTO existing FROM pelada_requests WHERE pelada_id = _pelada_id AND user_id = uid FOR UPDATE;
  IF FOUND THEN
    IF existing.status IN ('accepted','pending','waitlist') THEN RETURN existing.status; END IF;
    IF existing.status IN ('rejected','removed') THEN RAISE EXCEPTION 'O organizador não liberou sua entrada'; END IF;
  END IF;

  IF p.filled_slots >= p.total_slots THEN
    IF NOT p.waitlist_enabled THEN RAISE EXCEPTION 'Pelada lotada'; END IF;
    new_status := 'waitlist';
  ELSIF p.auto_approve THEN
    new_status := 'accepted';
  ELSE
    new_status := 'pending';
  END IF;

  IF FOUND THEN
    UPDATE pelada_requests SET status = new_status, created_at = now(),
      responded_at = CASE WHEN new_status = 'accepted' THEN now() ELSE NULL END
      WHERE id = existing.id;
  ELSE
    INSERT INTO pelada_requests (pelada_id, user_id, status, responded_at)
      VALUES (_pelada_id, uid, new_status, CASE WHEN new_status = 'accepted' THEN now() END);
  END IF;
  RETURN new_status;
END; $$;

-- returns next waitlisted user id (to notify), or null
CREATE OR REPLACE FUNCTION public.leave_pelada(_pelada_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  was_accepted boolean;
  nxt uuid;
BEGIN
  SELECT status = 'accepted' INTO was_accepted FROM pelada_requests
    WHERE pelada_id = _pelada_id AND user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE pelada_requests SET status = 'cancelled' WHERE pelada_id = _pelada_id AND user_id = uid;
  IF was_accepted THEN
    SELECT user_id INTO nxt FROM pelada_requests WHERE pelada_id = _pelada_id AND status = 'waitlist'
      ORDER BY created_at LIMIT 1;
  END IF;
  RETURN nxt;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_pelada_participant(_pelada_id uuid, _user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nxt uuid; was_accepted boolean;
BEGIN
  IF NOT (public.is_pelada_organizer(_pelada_id, auth.uid()) OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Apenas o organizador pode remover jogadores'; END IF;
  SELECT status = 'accepted' INTO was_accepted FROM pelada_requests WHERE pelada_id = _pelada_id AND user_id = _user_id;
  UPDATE pelada_requests SET status = 'removed', responded_at = now()
    WHERE pelada_id = _pelada_id AND user_id = _user_id;
  IF was_accepted THEN
    SELECT user_id INTO nxt FROM pelada_requests WHERE pelada_id = _pelada_id AND status = 'waitlist'
      ORDER BY created_at LIMIT 1;
  END IF;
  RETURN nxt;
END; $$;

CREATE OR REPLACE FUNCTION public.transfer_pelada(_pelada_id uuid, _new_organizer uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_org uuid;
BEGIN
  SELECT organizer_id INTO old_org FROM peladas WHERE id = _pelada_id FOR UPDATE;
  IF old_org IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Apenas o organizador pode transferir'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pelada_requests WHERE pelada_id = _pelada_id AND user_id = _new_organizer AND status = 'accepted') THEN
    RAISE EXCEPTION 'O novo organizador precisa estar confirmado na pelada'; END IF;
  UPDATE pelada_requests SET status = 'removed' WHERE pelada_id = _pelada_id AND user_id = _new_organizer;
  UPDATE peladas SET organizer_id = _new_organizer WHERE id = _pelada_id;
  INSERT INTO pelada_requests (pelada_id, user_id, status, responded_at)
    VALUES (_pelada_id, old_org, 'accepted', now())
    ON CONFLICT (pelada_id, user_id) DO UPDATE SET status = 'accepted', responded_at = now();
END; $$;

REVOKE EXECUTE ON FUNCTION public.join_pelada(uuid), public.leave_pelada(uuid),
  public.remove_pelada_participant(uuid, uuid), public.transfer_pelada(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_pelada(uuid), public.leave_pelada(uuid),
  public.remove_pelada_participant(uuid, uuid), public.transfer_pelada(uuid, uuid),
  public.is_pelada_member(uuid, uuid), public.is_pelada_organizer(uuid, uuid), public.is_blocked(uuid, uuid) TO authenticated;
