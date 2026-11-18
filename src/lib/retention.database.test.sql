-- Run with psql; every fixture is rolled back, including on assertion failure.
BEGIN;
DO $$
DECLARE owner_id uuid := gen_random_uuid(); tpl uuid; game uuid; i integer; n integer;
BEGIN
 -- Use an existing owner only inside this rolled-back transaction (legacy FK).
 SELECT id INTO owner_id FROM public.profiles LIMIT 1;
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Requires an existing test profile'; END IF;
 FOR i IN 1..12 LOOP
  INSERT INTO public.pelada_templates(organizer_id,name,location_name,address,latitude,longitude,weekday,time_of_day,active,created_at,total_slots,field_type,level)
   VALUES(owner_id,'retention-test-'||i,'Test','Test',0,0,1,'18:00',true,now()-make_interval(days=>i),10,'campo','iniciante') RETURNING id INTO tpl;
 END LOOP;
 PERFORM public.prune_inactive_templates();
 SELECT count(*) INTO n FROM public.pelada_templates WHERE organizer_id=owner_id AND name LIKE 'retention-test-%';
 IF n<>12 THEN RAISE EXCEPTION 'All 12 active templates must survive'; END IF;
 UPDATE public.pelada_templates SET active=false WHERE organizer_id=owner_id AND name LIKE 'retention-test-%';
 SELECT id INTO tpl FROM public.pelada_templates WHERE organizer_id=owner_id AND name='retention-test-12';
 INSERT INTO public.peladas(organizer_id,template_id,name,location_name,address,latitude,longitude,starts_at,total_slots,field_type,level)
 VALUES(owner_id,tpl,'retention-occurrence','Test','Test',0,0,now()-interval '7 days',10,'campo','iniciante') RETURNING id INTO game;
 PERFORM public.prune_inactive_templates();
 IF EXISTS(SELECT 1 FROM public.pelada_templates WHERE id=tpl) THEN RAISE EXCEPTION 'Oldest inactive definition must be removed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.peladas WHERE id=game AND template_id IS NULL AND was_recurring) THEN RAISE EXCEPTION 'Occurrence and recurring history must survive'; END IF;
 SELECT count(*) INTO n FROM public.pelada_templates WHERE organizer_id=owner_id;
 IF n<>10 THEN RAISE EXCEPTION 'Inactive history must reach 10'; END IF;
 SELECT id INTO tpl FROM public.pelada_templates WHERE organizer_id=owner_id LIMIT 1;
 INSERT INTO public.peladas(organizer_id,template_id,name,location_name,address,latitude,longitude,starts_at,total_slots,field_type,level)
 VALUES(owner_id,tpl,'renewal-test','Test','Test',0,0,now()+interval '2 days',10,'campo','iniciante');
 IF NOT EXISTS(SELECT 1 FROM public.pelada_templates WHERE id=tpl AND active) THEN RAISE EXCEPTION 'Renewal must activate and protect recurrence'; END IF;
 UPDATE public.peladas SET starts_at=now()-interval '23 hours',duration_minutes=90,status='cancelled' WHERE id=game;
 IF NOT public.is_group_open(game) THEN RAISE EXCEPTION 'Cancelled game must keep original deadline'; END IF;
 IF public.claim_expired_conversation(game) THEN RAISE EXCEPTION 'Must not claim before end plus 24 hours'; END IF;
 UPDATE public.peladas SET starts_at=now()-interval '3 days' WHERE id=game;
 IF public.is_group_open(game) THEN RAISE EXCEPTION 'Expired game must be blocked'; END IF;
 IF NOT public.claim_expired_conversation(game) THEN RAISE EXCEPTION 'Expired conversation should be claimable'; END IF;
 IF NOT public.purge_expired_conversation(game) THEN RAISE EXCEPTION 'Expired conversation should purge'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.peladas WHERE id=game) THEN RAISE EXCEPTION 'Game must survive purge'; END IF;
 IF public.purge_expired_conversation(game) THEN RAISE EXCEPTION 'Purge must be idempotent'; END IF;
 IF has_function_privilege('authenticated','public.purge_expired_conversation(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Users must not call privileged cleanup'; END IF;
END $$;
ROLLBACK;