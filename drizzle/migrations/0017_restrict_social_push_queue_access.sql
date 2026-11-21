REVOKE ALL ON public.social_push_queue FROM anon, authenticated;
GRANT ALL ON public.social_push_queue TO service_role;
REVOKE ALL ON FUNCTION public.claim_social_push(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_social_push(uuid) TO service_role;