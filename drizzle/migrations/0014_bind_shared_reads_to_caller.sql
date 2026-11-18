DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR NOT public.is_blocked(auth.uid(), id));

DROP POLICY IF EXISTS "Likes viewable by authenticated users" ON public.pelada_likes;
CREATE POLICY "Likes viewable by authenticated users" ON public.pelada_likes FOR SELECT TO authenticated
USING (user_id = auth.uid() OR NOT public.is_blocked(auth.uid(), user_id));

DROP POLICY IF EXISTS "Anyone authenticated reads ratings" ON public.pelada_ratings;
CREATE POLICY "Anyone authenticated reads ratings" ON public.pelada_ratings FOR SELECT TO authenticated
USING (auth.uid() IN (rater_id, rated_id) OR NOT public.is_blocked(auth.uid(), rated_id));

DROP POLICY IF EXISTS attendance_read ON public.pelada_attendance;
CREATE POLICY attendance_read ON public.pelada_attendance FOR SELECT TO authenticated
USING (user_id = auth.uid() OR NOT public.is_blocked(auth.uid(), user_id));

DROP POLICY IF EXISTS posture_read ON public.pelada_posture_ratings;
CREATE POLICY posture_read ON public.pelada_posture_ratings FOR SELECT TO authenticated
USING (auth.uid() IN (organizer_id, rated_id) OR NOT public.is_blocked(auth.uid(), rated_id));

DROP POLICY IF EXISTS "Authenticated users read chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users read chat attachments" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat' AND (owner_id = (select auth.uid()::text) OR public.can_read_chat_object(name)));

DROP POLICY IF EXISTS "Anyone authenticated reads pelada photos" ON storage.objects;
CREATE POLICY "Anyone authenticated reads pelada photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'peladas' AND (owner_id = (select auth.uid()::text) OR (select auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "Users read all avatars" ON storage.objects;
CREATE POLICY "Users read all avatars" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (owner_id = (select auth.uid()::text) OR NOT public.is_blocked((select auth.uid()), owner)));