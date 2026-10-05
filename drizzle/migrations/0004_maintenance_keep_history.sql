CREATE OR REPLACE FUNCTION public.pelada_group_maintenance() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.pelada_group_messages m USING public.peladas p
  WHERE m.pelada_id = p.id AND m.created_at < now() - CASE WHEN p.template_id IS NOT NULL THEN interval '7 days' ELSE interval '24 hours' END;
  -- Fixed peladas: pending/waitlist entries of a past occurrence expire 24h after it ends;
  -- confirmed players keep their history and must confirm again on the next weekly occurrence (new row).
  UPDATE public.pelada_requests r SET status = 'cancelled'
  FROM public.peladas p
  WHERE r.pelada_id = p.id AND p.template_id IS NOT NULL AND r.status IN ('pending','waitlist')
    AND p.starts_at + (p.duration_minutes || ' minutes')::interval + interval '24 hours' < now();
END; $$;