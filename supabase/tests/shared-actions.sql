-- Development audit: temporary fixtures, always rolled back.
begin;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000004101','{"full_name":"Action audit A"}'),
 ('00000000-0000-4000-8000-000000004102','{"full_name":"Action audit B"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000004101',true);
do $$
declare aid uuid; mid uuid; bid uuid; xid uuid := gen_random_uuid(); stamp timestamptz; other_id uuid;
begin
 aid := public.create_area('Action audit','book-open','#F4BD55');
 mid := public.set_reading_module(aid);
 bid := public.save_reading_book(mid,'{"title":"Audit book","authors":[],"total_pages":300,"initial_tracking_page":0,"status":"READING"}');
 perform public.save_area_action(jsonb_build_object('area_id',aid,'book_id',bid,'title','Read a chapter','completed',false,'due_on','2026-10-25','due_time','20:00'),xid);
 select updated_at into strict stamp from public.actions where id=xid;
 perform public.complete_area_action(xid,true,stamp);
 if not exists(select 1 from public.actions where id=xid and completed) then raise exception 'Completion did not persist'; end if;
 if exists(select 1 from public.reading_logs) or exists(select 1 from public.goal_records) then
  -- RLS scopes this assertion to the isolated fixture account.
  raise exception 'Action created reading or goal records';
 end if;
 begin
  perform public.complete_area_action(xid,false,stamp);
  raise exception 'Stale update accepted';
 exception when serialization_failure then null; end;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000004102',true);
 if public.get_area_actions(aid) <> '[]'::jsonb then raise exception 'Actions leaked across accounts'; end if;
 begin
  perform public.complete_area_action(xid,false,stamp);
  raise exception 'Foreign update accepted';
 exception when serialization_failure then null; end;
 other_id := public.create_area('Other area','book-open','#F4BD55');
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000004101',true);
 begin
  perform public.save_area_action(jsonb_build_object('area_id',other_id,'book_id',bid,'title','Invalid area','completed',false),gen_random_uuid());
  raise exception 'Foreign area accepted';
 exception when check_violation or foreign_key_violation then null; end;
end $$;
reset role;
select json_build_object('action_completion_without_pages',true,'owner_isolation',true,'stale_update_rejected',true,'foreign_area_rejected',true,'fixtures_rolled_back',true) as audit;
rollback;
