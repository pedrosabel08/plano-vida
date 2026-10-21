-- Phase 2 regression for a development Supabase/PostgreSQL database.
-- Temporary identities and every mutation are contained in this transaction.
-- Never run this file piecemeal. Success and failure must leave no permanent fixtures.
begin;
insert into auth.users(id,raw_user_meta_data) values ('f2000000-0000-4000-8000-000000000001','{"full_name":"Phase 2 transient A"}'),('f2000000-0000-4000-8000-000000000002','{"full_name":"Phase 2 transient B"}');
set local role authenticated;
do $test$
declare area_a uuid;area_b uuid;obj_a uuid;obj_b uuid;goal_a uuid;goal_b uuid;week_a uuid;week_b uuid;record_a uuid;key_a uuid:=gen_random_uuid();checks integer:=0;payload jsonb;
begin
perform set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',true);perform set_config('request.jwt.claims','{"sub":"f2000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

if not coalesce((auth.uid()='f2000000-0000-4000-8000-000000000001'::uuid),false) then raise exception 'Assertion failed: authenticated subject A';end if;checks:=checks+1;

select public.create_area('Phase 2 transient A','book-open','#F4BD55') into area_a;
insert into public.objectives(title,type,area_id) values ('Phase 2 objective A','QUALITATIVE',area_a) returning id into obj_a;
payload:=jsonb_build_object('title','Phase 2 quantity','type','QUANTITY','target','70','unit','páginas','basis','WEEKLY','frequency_mode','OCCURRENCES','expected_observations',7,'observation_unit','dias','state','ACTIVE','objective_id',obj_a);
select public.save_weekly_goal('2026-10-19',area_a,payload) into goal_a;
select week_id into week_a from public.weekly_goals where id=goal_a;
if not coalesce(((select count(*) from public.goal_sources where goal_id=goal_a and kind='MANUAL')=1),false) then raise exception 'Assertion failed: one canonical manual source';end if;checks:=checks+1;

select public.save_goal_record(goal_a,jsonb_build_object('recorded_on','2026-10-20','value','56','completed',null,'operation_id',key_a)) into record_a;
if not coalesce(((select value from public.goal_records where id=record_a)=56),false) then raise exception 'Assertion failed: execution persisted';end if;checks:=checks+1;

perform public.save_goal_record(goal_a,jsonb_build_object('recorded_on','2026-10-20','value','56','completed',null,'operation_id',key_a));
if not coalesce(((select count(*) from public.goal_records where goal_id=goal_a)=1),false) then raise exception 'Assertion failed: idempotent submission';end if;checks:=checks+1;

if not coalesce(((public.get_planning_data('2026-10-19')->'records'->0->>'value')='56'),false) then raise exception 'Assertion failed: lossless read payload';end if;checks:=checks+1;

if not coalesce((public.ensure_planning_week('2026-10-19')=week_a),false) then raise exception 'Assertion failed: same period has same identity';end if;checks:=checks+1;

update public.profiles set timezone='Europe/Lisbon' where user_id=auth.uid();
if not coalesce((public.ensure_planning_week('2026-10-19')=week_a),false) then raise exception 'Assertion failed: timezone change does not duplicate week';end if;checks:=checks+1;

if not coalesce(((select timezone from public.weeks where id=week_a)='America/Sao_Paulo'),false) then raise exception 'Assertion failed: existing context preserved';end if;checks:=checks+1;

begin update public.weekly_goals set unit='horas' where id=goal_a;raise exception 'Expected rejection: measurement semantics locked';exception when sqlstate '22023' then null;end;checks:=checks+1;

begin delete from public.areas where id=area_a;raise exception 'Expected rejection: area RESTRICT';exception when foreign_key_violation or restrict_violation then null;end;checks:=checks+1;

begin delete from public.objectives where id=obj_a;raise exception 'Expected rejection: objective RESTRICT';exception when foreign_key_violation or restrict_violation then null;end;checks:=checks+1;

perform set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000002',true);perform set_config('request.jwt.claims','{"sub":"f2000000-0000-4000-8000-000000000002","role":"authenticated"}',true);

if not coalesce((not exists(select 1 from public.objectives where id=obj_a)),false) then raise exception 'Assertion failed: objective isolation';end if;checks:=checks+1;

if not coalesce((not exists(select 1 from public.weeks where id=week_a)),false) then raise exception 'Assertion failed: week isolation';end if;checks:=checks+1;

if not coalesce((not exists(select 1 from public.area_weekly_plans where week_id=week_a)),false) then raise exception 'Assertion failed: plan isolation';end if;checks:=checks+1;

if not coalesce((not exists(select 1 from public.weekly_goals where id=goal_a)),false) then raise exception 'Assertion failed: goal isolation';end if;checks:=checks+1;

if not coalesce((not exists(select 1 from public.goal_sources where goal_id=goal_a)),false) then raise exception 'Assertion failed: source isolation';end if;checks:=checks+1;

if not coalesce((not exists(select 1 from public.goal_records where id=record_a)),false) then raise exception 'Assertion failed: record isolation';end if;checks:=checks+1;

if not coalesce((jsonb_array_length(public.get_planning_data('2026-10-19')->'goals')=0),false) then raise exception 'Assertion failed: RPC isolation';end if;checks:=checks+1;

select public.create_area('Phase 2 transient B','leaf','#47D6C7') into area_b;
insert into public.objectives(title,type,area_id) values ('Phase 2 objective B','QUALITATIVE',area_b) returning id into obj_b;
payload:=payload||jsonb_build_object('objective_id',obj_b);
select public.save_weekly_goal('2026-10-19',area_b,payload) into goal_b;
select week_id into week_b from public.weekly_goals where id=goal_b;
begin insert into public.area_weekly_plans(week_id,area_id) values (week_b,area_a);raise exception 'Expected rejection: foreign area in plan';exception when foreign_key_violation or restrict_violation then null;end;checks:=checks+1;

begin perform public.save_weekly_goal('2026-10-19',area_b,payload||jsonb_build_object('objective_id',obj_a));raise exception 'Expected rejection: foreign objective in goal';exception when check_violation then null;end;checks:=checks+1;

begin perform public.save_weekly_goal('2026-10-19',area_a,payload);raise exception 'Expected rejection: foreign area in goal';exception when foreign_key_violation or check_violation then null;end;checks:=checks+1;

begin perform public.save_goal_record(goal_a,jsonb_build_object('recorded_on','2026-10-20','value','1','completed',null,'operation_id',gen_random_uuid()));raise exception 'Expected rejection: foreign goal in record';exception when no_data_found or foreign_key_violation then null;end;checks:=checks+1;

begin insert into public.weeks(start_date) values ('2026-10-19');raise exception 'Expected rejection: duplicate week';exception when unique_violation then null;end;checks:=checks+1;

begin insert into public.area_weekly_plans(week_id,area_id) values (week_b,area_b);raise exception 'Expected rejection: duplicate area plan';exception when unique_violation then null;end;checks:=checks+1;

begin perform public.save_weekly_goal('2026-10-19',area_b,payload||jsonb_build_object('target','0'));raise exception 'Expected rejection: zero target';exception when check_violation then null;end;checks:=checks+1;

begin perform public.save_weekly_goal('2026-10-19',area_b,payload||jsonb_build_object('type','FREQUENCY','target','1.5'));raise exception 'Expected rejection: fractional frequency target';exception when check_violation then null;end;checks:=checks+1;

begin perform public.save_weekly_goal('2026-10-19',area_b,payload||jsonb_build_object('type','COMPLETION','target','2'));raise exception 'Expected rejection: non-binary completion target';exception when check_violation then null;end;checks:=checks+1;

begin perform public.save_goal_record(goal_b,jsonb_build_object('recorded_on','2026-10-26','value','1','completed',null,'operation_id',gen_random_uuid()));raise exception 'Expected rejection: record outside period';exception when check_violation then null;end;checks:=checks+1;

begin insert into public.objectives(user_id,title,type) values ('f2000000-0000-4000-8000-000000000001','Forged','QUALITATIVE');raise exception 'Expected rejection: forged ownership';exception when insufficient_privilege then null;end;checks:=checks+1;

begin update public.weekly_goals set user_id='f2000000-0000-4000-8000-000000000001' where id=goal_b;raise exception 'Expected rejection: immutable owner';exception when insufficient_privilege then null;end;checks:=checks+1;

if not coalesce(((select count(*) from public.weekly_goals)=1),false) then raise exception 'Assertion failed: failed operations are rolled back';end if;checks:=checks+1;

perform set_config('plano.phase2_test_count',checks::text,true);
end;
$test$;
set local role anon;
do $test$ declare t text;checks integer:=current_setting('plano.phase2_test_count')::integer;begin
foreach t in array array['objectives','weeks','area_weekly_plans','weekly_goals','goal_sources','goal_records'] loop
 begin execute format('select * from public.%I',t);raise exception 'Anonymous access must be denied';exception when insufficient_privilege then null;end;checks:=checks+1;
end loop;
begin perform public.get_planning_data('2026-10-19');raise exception 'Anonymous RPC must be denied';exception when insufficient_privilege then null;end;checks:=checks+1;
perform set_config('plano.phase2_test_count',checks::text,true);
end;$test$;
reset role;
select current_setting('plano.phase2_test_count')::integer as passed_assertions,'All test data will be rolled back' as result;
rollback;
