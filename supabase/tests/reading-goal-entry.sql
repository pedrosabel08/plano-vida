-- Isolated fixtures, always rolled back. Never changes an existing user's data.
begin;
insert into auth.users(id,raw_user_meta_data) values
 ('f3000000-0000-4000-8000-000000000004','{"full_name":"Reading goal entry regression"}');
set local role authenticated;
do $$
declare
 owner_id uuid := 'f3000000-0000-4000-8000-000000000004';
 area_id uuid; module_id uuid; book_a uuid; book_b uuid; v_goal_id uuid;
 actual integer; log_count integer; record_count integer;
begin
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 area_id := public.create_area('Reading goal regression','book-open','#F4BD55');
 module_id := public.set_reading_module(area_id);
 book_a := public.save_reading_book(module_id,'{"title":"Livro A","total_pages":300,"initial_tracking_page":0,"authors":[],"status":"READING"}');
 book_b := public.save_reading_book(module_id,'{"title":"Livro B","total_pages":300,"initial_tracking_page":0,"authors":[],"status":"READING"}');
 v_goal_id := public.save_reading_goal('2026-10-19',area_id,
  '{"title":"Leitura semanal 70","type":"QUANTITY","unit":"páginas","target":"70","basis":"WEEKLY","frequency_mode":"OCCURRENCES","expected_observations":7,"observation_unit":"dias","state":"ACTIVE"}');
 perform public.save_reading_log(book_a,jsonb_build_object('pages',21,'read_on','2026-10-20','operation_id',gen_random_uuid()));
 perform public.save_reading_log(book_b,jsonb_build_object('pages',35,'read_on','2026-10-21','operation_id',gen_random_uuid()));
 select sum((v->>'pages')::int) into actual from jsonb_array_elements(public.get_planning_data('2026-10-19')->'reading_logs') v;
 select count(*) into log_count from public.reading_logs where user_id=owner_id;
 select count(*) into record_count from public.goal_records r where r.goal_id=v_goal_id;
 if actual<>56 or log_count<>2 or record_count<>0 then raise exception 'Unexpected canonical measurements';end if;
 if exists(select 1 from public.reading_logs where user_id=owner_id and book_id is null) then raise exception 'Missing book';end if;
 begin
  perform public.save_goal_record(v_goal_id,jsonb_build_object('value','21','recorded_on','2026-10-20','operation_id',gen_random_uuid()));
  raise exception 'MODULE accepted a GoalRecord';
 exception when check_violation then null;end;
 perform set_config('reading.entry.audit',jsonb_build_object(
  'kind','MODULE','module','READING','metric','PAGES_READ','scope','ALL_BOOKS',
  'reading_logs',log_count,'pages_by_book',jsonb_build_array(21,35),
  'goal_records',record_count,'actual',actual,'target',70,
  'percent',actual*100/70,'score',actual*10.0/70,'manual_write_rejected',true,
  'transaction','ROLLBACK')::text,true);
end; $$ language plpgsql;
select current_setting('reading.entry.audit')::jsonb as audit;
rollback;
