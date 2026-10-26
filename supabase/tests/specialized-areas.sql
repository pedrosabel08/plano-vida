-- Isolated development audit, no existing-account data is changed. Always rolls back.
begin;
insert into auth.users(id,raw_user_meta_data) values
 ('a7100000-0000-4000-8000-000000000001','{"full_name":"Specialized audit A"}'),
 ('a7100000-0000-4000-8000-000000000002','{"full_name":"Specialized audit B"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','a7100000-0000-4000-8000-000000000001',true);
do $$
declare aid uuid; sid uuid:=gen_random_uuid(); logid uuid:=gen_random_uuid(); cid uuid:=gen_random_uuid(); txid uuid:=gen_random_uuid(); fg uuid:=gen_random_uuid();pid uuid:=gen_random_uuid();rid uuid:=gen_random_uuid();ckid uuid:=gen_random_uuid();stamp timestamptz;payload jsonb;goalid uuid;actual bigint;
begin
 aid:=public.create_area('Specialized audit','book-open','#F4BD55');
 perform public.save_study_subject(jsonb_build_object('area_id',aid,'title','Aprender','target_minutes',600,'archived',false,'objective_id',null),sid);
 payload:=jsonb_build_object('area_id',aid,'subject_id',sid,'studied_on','2026-10-20','minutes',120,'notes','','is_deleted',false);
 perform public.save_study_session(payload,logid);perform public.save_study_session(payload,logid);
 goalid:=public.save_study_goal('2026-10-19',aid,'{"title":"Estudar","target":300,"state":"ACTIVE","objective_id":null}');
 if (select count(*) from public.study_sessions)<>1 or (select sum(minutes) from public.study_sessions)<>120 then raise exception 'Canonical study retry failed';end if;
 if not exists(select 1 from public.goal_sources where goal_id=goalid and module='STUDIES' and metric='MINUTES_STUDIED') then raise exception 'Study shared goal source failed';end if;
 if exists(select 1 from public.goal_records) then raise exception 'Unexpected manual copy';end if;
 select updated_at into stamp from public.study_sessions where id=logid;
 perform public.save_study_session(payload||'{"minutes":150}',logid,stamp);
 begin perform public.save_study_session(payload,logid,stamp);raise exception 'Stale study write accepted';exception when serialization_failure then null;end;

 perform public.save_finance_category(jsonb_build_object('area_id',aid,'title','Casa','kind','EXPENSE','archived',false),cid);
 payload:=jsonb_build_object('area_id',aid,'category_id',cid,'kind','EXPENSE','description','Conta','amount_cents',20002,'booked_on','2026-10-20','status','REALIZED','is_deleted',false);
 perform public.save_finance_transaction(payload,txid);perform public.save_finance_transaction(payload,txid);
 select sum(amount_cents) into actual from public.finance_transactions where status='REALIZED';if actual<>20002 then raise exception 'Exact cents failed';end if;
 perform public.save_finance_budget(jsonb_build_object('area_id',aid,'category_id',cid,'month','2026-10-01','limit_cents',30000),gen_random_uuid());
 perform public.save_finance_goal(jsonb_build_object('area_id',aid,'title','Reserva','target_cents',100000,'due_on',null,'objective_id',null,'archived',false),fg);
 perform public.save_finance_contribution(jsonb_build_object('area_id',aid,'goal_id',fg,'amount_cents',12345,'recorded_on','2026-10-20','is_deleted',false),gen_random_uuid());
 if (select count(*) from public.finance_transactions)<>1 then raise exception 'Contribution created transaction';end if;

 perform public.save_career_project(jsonb_build_object('area_id',aid,'title','Projeto','kind','WORK','due_on','2026-12-01','objective_id',null,'status','ACTIVE'),pid);
 perform public.save_career_milestone(jsonb_build_object('area_id',aid,'project_id',pid,'title','Primeira entrega','kind','DELIVERY','due_on','2026-10-20','completed_on','2026-10-20','is_deleted',false),gen_random_uuid());
 perform public.save_career_commitment(jsonb_build_object('area_id',aid,'project_id',pid,'title','Reunião','kind','MEETING','due_on','2026-10-20','completed_on','2026-10-20','is_deleted',false),gen_random_uuid());
 perform public.save_career_setting(jsonb_build_object('area_id',aid,'study_area_id',aid,'study_target_minutes',300,'objective_id',null),gen_random_uuid());
 if jsonb_array_length(public.get_career_data(aid)->'study_sessions')<>1 then raise exception 'Linked canonical studies failed';end if;
 perform public.save_career_review(jsonb_build_object('area_id',aid,'reviewed_on','2026-10-20','wins','Primeira entrega','lessons','Validar cedo','next_steps','Continuar'),gen_random_uuid());

 perform public.save_health_setting(jsonb_build_object('area_id',aid,'sleep_target_minutes',480),gen_random_uuid());
 perform public.save_sleep_log(jsonb_build_object('area_id',aid,'bed_at','2026-10-20T02:00Z','wake_at','2026-10-20T10:00Z','timezone','America/Sao_Paulo','energy',3,'is_deleted',false),gen_random_uuid());
 if not exists(select 1 from public.sleep_logs where wake_on='2026-10-20' and extract(epoch from wake_at-bed_at)/60=480) then raise exception 'Sleep instants failed';end if;
 perform public.save_health_routine(jsonb_build_object('area_id',aid,'title','Rotina pessoal','kind','ORAL','starts_on','2026-10-19','ends_on',null),rid);
 payload:=jsonb_build_object('area_id',aid,'routine_id',rid,'completed_on','2026-10-20','completed',true);
 perform public.save_routine_check(payload,ckid);perform public.save_routine_check(payload,ckid);
 select updated_at into stamp from public.routine_checks where id=ckid;
 perform public.save_routine_check(payload||'{"completed":false}',ckid,stamp);
 if exists(select 1 from public.routine_checks where completed) then raise exception 'Checklist toggle failed';end if;
 begin perform public.save_routine_check(payload||'{"completed_on":"2026-10-18"}',gen_random_uuid());raise exception 'Out of schedule check accepted';exception when check_violation then null;end;
 perform public.set_area_dashboard(aid,'carreira');
 if public.get_area_dashboard(aid)<>'carreira' then raise exception 'Preference failed';end if;

 perform set_config('request.jwt.claim.sub','a7100000-0000-4000-8000-000000000002',true);
 if jsonb_array_length(public.get_studies_data(aid)->'sessions')<>0 or jsonb_array_length(public.get_finance_data(aid)->'transactions')<>0 or jsonb_array_length(public.get_career_data(aid)->'projects')<>0 or jsonb_array_length(public.get_health_data(aid)->'nights')<>0 or public.get_area_dashboard(aid) is not null then raise exception 'Cross-owner leak';end if;
 begin perform public.save_study_session(jsonb_build_object('area_id',aid,'subject_id',sid,'studied_on','2026-10-20','minutes',10,'notes','','is_deleted',false),gen_random_uuid());raise exception 'Foreign write accepted';exception when check_violation or foreign_key_violation or insufficient_privilege then null;end;
end;$$;
reset role;
select jsonb_build_object('studies_canonical',true,'exact_finance_cents',true,'explicit_contributions',true,'career_milestones_and_linked_studies',true,'sleep_instants',true,'routine_schedule',true,'owner_isolation',true,'stale_update_rejected',true,'idempotent_retries',true,'fixtures_rolled_back',true) as audit;
rollback;
