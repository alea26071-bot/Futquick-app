-- All fixtures and profile changes roll back, including on failure.
BEGIN;
DO $$
DECLARE owner_id uuid; player_id uuid; outsider uuid; game uuid; other_game uuid; future_game uuid; average numeric; denied boolean;
BEGIN
 SELECT id INTO owner_id FROM public.profiles ORDER BY id LIMIT 1;
 SELECT id INTO player_id FROM public.profiles WHERE id<>owner_id ORDER BY id LIMIT 1;
 SELECT id INTO outsider FROM public.profiles WHERE id NOT IN(owner_id,player_id) ORDER BY id LIMIT 1;
 IF outsider IS NULL THEN RAISE EXCEPTION 'Requires three test profiles'; END IF;
 INSERT INTO public.peladas(organizer_id,name,location_name,address,latitude,longitude,starts_at,total_slots,field_type,level,duration_minutes)
 VALUES(owner_id,'reputation-db-test','Test','Test',0,0,now()-interval '3 days',10,'campo','iniciante',90) RETURNING id INTO game;
 INSERT INTO public.peladas(organizer_id,name,location_name,address,latitude,longitude,starts_at,total_slots,field_type,level,duration_minutes)
 VALUES(outsider,'reputation-db-test-other','Test','Test',0,0,now()-interval '3 days',10,'campo','iniciante',90) RETURNING id INTO other_game;
 INSERT INTO public.peladas(organizer_id,name,location_name,address,latitude,longitude,starts_at,total_slots,field_type,level)
 VALUES(owner_id,'reputation-db-test-future','Test','Test',0,0,now()+interval '3 days',10,'campo','iniciante') RETURNING id INTO future_game;
 INSERT INTO public.pelada_requests(pelada_id,user_id,status) VALUES(game,player_id,'accepted'),(game,outsider,'accepted'),(other_game,player_id,'accepted');
 PERFORM set_config('request.jwt.claim.sub',player_id::text,true);
 denied:=false; BEGIN PERFORM public.confirm_game_attendance(game,player_id); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Only organizer confirms attendance'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 denied:=false; BEGIN PERFORM public.confirm_game_attendance(future_game,owner_id); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Future game cannot accept attendance'; END IF;
 PERFORM public.confirm_game_attendance(game,owner_id); PERFORM public.confirm_game_attendance(game,player_id);
 denied:=false; BEGIN PERFORM public.submit_game_stars(game,owner_id,5); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'No self stars'; END IF;
 denied:=false; BEGIN PERFORM public.submit_game_posture(game,owner_id,100); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'No organizer self posture'; END IF;
 denied:=false; BEGIN PERFORM public.submit_game_stars(game,outsider,5); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Reserved without attendance cannot receive stars'; END IF;
 PERFORM public.submit_game_stars(game,player_id,2);
 PERFORM public.submit_game_posture(game,player_id,0);
 denied:=false; BEGIN PERFORM public.submit_game_stars(game,player_id,5); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'No duplicate stars'; END IF;
 denied:=false; BEGIN PERFORM public.submit_game_posture(game,player_id,100); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'No duplicate posture'; END IF;
 PERFORM set_config('request.jwt.claim.sub',outsider::text,true);
 denied:=false; BEGIN PERFORM public.submit_game_stars(game,player_id,5); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Absent cannot give stars'; END IF;
 denied:=false; BEGIN PERFORM public.submit_game_posture(game,player_id,100); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Other organizer cannot give posture'; END IF;
 PERFORM public.confirm_game_attendance(other_game,outsider); PERFORM public.confirm_game_attendance(other_game,player_id);
 PERFORM public.submit_game_stars(other_game,player_id,5); PERFORM public.submit_game_posture(other_game,player_id,100);
 SELECT stars_average INTO average FROM public.profiles WHERE id=player_id;
 IF average<>3.5 THEN RAISE EXCEPTION 'Stars expected 3.5 got %',average; END IF;
 SELECT posture_average INTO average FROM public.profiles WHERE id=player_id;
 IF average<>50 THEN RAISE EXCEPTION 'Posture expected 50 got %',average; END IF;
 PERFORM set_config('request.jwt.claim.sub',player_id::text,true);
 IF NOT EXISTS(SELECT 1 FROM public.pending_game_ratings() WHERE pelada_id=game AND pending_count=1) THEN RAISE EXCEPTION 'Expected one pending star rating'; END IF;
 PERFORM public.submit_game_stars(game,owner_id,4);
 IF EXISTS(SELECT 1 FROM public.pending_game_ratings() WHERE pelada_id=game) THEN RAISE EXCEPTION 'Completed pending rating must disappear'; END IF;
 IF NOT public.claim_expired_conversation(game) OR NOT public.purge_expired_conversation(game) THEN RAISE EXCEPTION 'Expected conversation purge'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pelada_ratings WHERE pelada_id=game AND presence_verified) OR NOT EXISTS(SELECT 1 FROM public.pelada_posture_ratings WHERE pelada_id=game) OR NOT EXISTS(SELECT 1 FROM public.pelada_attendance WHERE pelada_id=game) THEN RAISE EXCEPTION 'Cleanup must preserve all reputation history'; END IF;
 IF has_table_privilege('authenticated','public.pelada_ratings','INSERT') OR has_table_privilege('authenticated','public.pelada_posture_ratings','INSERT') OR has_table_privilege('authenticated','public.pelada_attendance','INSERT') THEN RAISE EXCEPTION 'Direct writes must be denied'; END IF;
 EXECUTE 'SET LOCAL ROLE authenticated';
 denied:=false; BEGIN UPDATE public.profiles SET posture_average=99 WHERE id=player_id; EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Direct average update must be denied'; END IF;
 EXECUTE 'RESET ROLE';
 RAISE NOTICE 'Reputation: eligibility, organizer rules, duplicates, independent averages, pending ratings, cleanup and direct-write protection passed';
END $$;
ROLLBACK;
