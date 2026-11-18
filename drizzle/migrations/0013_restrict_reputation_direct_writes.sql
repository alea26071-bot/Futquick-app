REVOKE INSERT,UPDATE,DELETE ON public.pelada_attendance,public.pelada_posture_ratings FROM authenticated,anon,PUBLIC;
GRANT SELECT ON public.pelada_attendance,public.pelada_posture_ratings TO authenticated;
GRANT ALL ON public.pelada_attendance,public.pelada_posture_ratings TO service_role;