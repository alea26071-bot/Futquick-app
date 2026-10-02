CREATE OR REPLACE FUNCTION public.add_pelada_participant(_pelada_id uuid, _user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.peladas%ROWTYPE; cur text;
BEGIN
  SELECT * INTO p FROM peladas WHERE id = _pelada_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pelada não encontrada'; END IF;
  IF NOT (p.organizer_id = auth.uid() OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Apenas o organizador pode adicionar jogadores'; END IF;
  IF _user_id = p.organizer_id THEN RAISE EXCEPTION 'Este usuário já organiza a pelada'; END IF;
  IF p.status = 'finished' THEN RAISE EXCEPTION 'Pelada encerrada'; END IF;
  IF public.is_blocked(p.organizer_id, _user_id) THEN RAISE EXCEPTION 'Não é possível adicionar este usuário'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = _user_id AND suspended_at IS NOT NULL) THEN RAISE EXCEPTION 'Usuário suspenso'; END IF;
  SELECT status INTO cur FROM pelada_requests WHERE pelada_id = _pelada_id AND user_id = _user_id FOR UPDATE;
  IF cur = 'accepted' THEN RETURN 'already'; END IF;
  IF p.filled_slots >= p.total_slots THEN RAISE EXCEPTION 'Pelada lotada'; END IF;
  INSERT INTO pelada_requests (pelada_id, user_id, status, responded_at)
    VALUES (_pelada_id, _user_id, 'accepted', now())
    ON CONFLICT (pelada_id, user_id) DO UPDATE SET status = 'accepted', responded_at = now();
  RETURN 'accepted';
END; $$;
REVOKE ALL ON FUNCTION public.add_pelada_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_pelada_participant(uuid, uuid) TO authenticated;