-- Ephemeral owned fixtures only. Never reset the hosted database.
begin;
insert into auth.users(id,raw_user_meta_data) values ('f3000000-0000-4000-8000-000000000001','{"full_name":"Phase 3 transient A"}'),('f3000000-0000-4000-8000-000000000002','{"full_name":"Phase 3 transient B"}');
set local role authenticated;
do $$
declare a uuid:='f3000000-0000-4000-8000-000000000001';b uuid:='f3000000-0000-4000-8000-000000000002';aa uuid;ab uuid;ma uuid;mb uuid;ba uuid;bb uuid;bi uuid;g uuid;g2 uuid;l uuid;correction uuid;op uuid:=gen_random_uuid();stamp timestamptz;n integer:=0;book_data jsonb:='{"title":"Livro teste","authors":["Autor teste"],"total_pages":300,"initial_tracking_page":0,"status":"READING"}';goal_data jsonb:='{"title":"Ler 70 páginas","type":"QUANTITY","unit":"páginas","target":"70","basis":"WEEKLY","frequency_mode":"OCCURRENCES","expected_observations":7,"observation_unit":"dias","state":"ACTIVE"}';
begin
perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
aa:=public.create_area('Minha biblioteca','book-open','#F4BD55');ma:=public.set_reading_module(aa);ba:=public.save_reading_book(ma,book_data);
g:=public.save_reading_goal('2026-10-19',aa,goal_data);
l:=public.save_reading_log(ba,jsonb_build_object('pages',20,'read_on','2026-10-20','operation_id',op));
if not coalesce((public.save_reading_log(ba,jsonb_build_object('pages',20,'read_on','2026-10-20','operation_id',op))=l),false) then raise exception 'Idempotency';end if;n:=n+1;

begin perform public.save_reading_log(ba,jsonb_build_object('pages',21,'read_on','2026-10-20','operation_id',op));raise exception 'Expected rejection';exception when invalid_parameter_value then n:=n+1;end;

perform public.save_reading_log(ba,jsonb_build_object('pages',36,'read_on','2026-10-21','operation_id',gen_random_uuid()));
if not coalesce(((select count(*)=2 from public.reading_logs)),false) then raise exception 'No retry duplication';end if;n:=n+1;

if not coalesce(((select (v->>'current_page')::int=56 from jsonb_array_elements(public.get_reading_books()) v where v->>'id'=ba::text)),false) then raise exception 'Derived position';end if;n:=n+1;

if not coalesce(((select count(*)=0 from public.goal_records)),false) then raise exception 'No manual mirror';end if;n:=n+1;

if not coalesce(((select kind='MODULE' and module='READING' and metric='PAGES_READ' and scope='ALL_BOOKS' from public.goal_sources where goal_id=g)),false) then raise exception 'Structured source';end if;n:=n+1;

if not coalesce(((select sum((v->>'pages')::int)=56 from jsonb_array_elements(public.get_planning_data('2026-10-19')->'reading_logs') v)),false) then raise exception 'Week actual 56';end if;n:=n+1;

begin perform public.save_reading_log(ba,jsonb_build_object('pages',245,'read_on','2026-10-21','operation_id',gen_random_uuid()));raise exception 'Expected rejection';exception when check_violation then n:=n+1;end;

begin perform public.save_reading_log(ba,jsonb_build_object('pages',0,'read_on','2026-10-21','operation_id',gen_random_uuid()));raise exception 'Expected rejection';exception when check_violation then n:=n+1;end;

begin perform public.save_reading_log(ba,jsonb_build_object('pages',-1,'read_on','2026-10-21','operation_id',gen_random_uuid()));raise exception 'Expected rejection';exception when check_violation then n:=n+1;end;

begin perform public.save_reading_log(ba,jsonb_build_object('pages','1.5','read_on','2026-10-21','operation_id',gen_random_uuid()));raise exception 'Expected rejection';exception when invalid_text_representation then n:=n+1;end;

begin update public.books set total_pages=55 where id=ba;raise exception 'Expected rejection';exception when check_violation then n:=n+1;end;

begin update public.books set initial_tracking_page=301 where id=ba;raise exception 'Expected rejection';exception when check_violation then n:=n+1;end;

begin perform public.save_goal_record(g,jsonb_build_object('value','56','completed',null,'recorded_on','2026-10-20','operation_id',gen_random_uuid()));raise exception 'Expected rejection';exception when check_violation then n:=n+1;end;

begin update public.weekly_goals set type='AVERAGE' where id=g;raise exception 'Expected rejection';exception when check_violation then n:=n+1;end;

begin update public.goal_sources set kind='MANUAL',module=null,metric=null,scope=null,area_module_id=null where goal_id=g;raise exception 'Expected rejection';exception when invalid_parameter_value then n:=n+1;end;

correction:=public.save_reading_log(ba,jsonb_build_object('pages',80,'read_on','2026-10-22','operation_id',gen_random_uuid()));select updated_at into stamp from public.reading_logs where id=correction;
perform public.save_reading_log(ba,jsonb_build_object('pages',8,'read_on','2026-10-22','expected_updated_at',stamp),correction);
if not coalesce(((public.get_reading_books()->0->>'current_page')::int=64),false) then raise exception 'Correction 80 to 8';end if;n:=n+1;

begin perform public.save_reading_log(ba,jsonb_build_object('pages',9,'read_on','2026-10-22','expected_updated_at',stamp),correction);raise exception 'Expected rejection';exception when serialization_failure then n:=n+1;end;

select updated_at into stamp from public.reading_logs where id=correction;
perform public.save_reading_log(ba,jsonb_build_object('pages',8,'read_on','2026-10-22','expected_updated_at',stamp,'is_deleted',true),correction);
if not coalesce(((select (v->>'current_page')::int=56 from jsonb_array_elements(public.get_reading_books()) v where v->>'id'=ba::text)),false) then raise exception 'Logical removal';end if;n:=n+1;

if not coalesce(((select is_deleted from public.reading_logs where id=correction)),false) then raise exception 'Retain removed history';end if;n:=n+1;

bi:=public.save_reading_book(ma,book_data||'{"initial_tracking_page":120}');
if not coalesce(((select (v->>'current_page')::int=120 from jsonb_array_elements(public.get_reading_books()) v where v->>'id'=bi::text)),false) then raise exception 'Initial page is position';end if;n:=n+1;

g2:=public.save_reading_goal('2026-10-19',aa,goal_data,bi);
if not coalesce(((select scope='BOOK' and book_id=bi from public.goal_sources where goal_id=g2)),false) then raise exception 'Explicit book scope';end if;n:=n+1;

if not coalesce(((select sum((v->>'pages')::int)=56 from jsonb_array_elements(public.get_planning_data('2026-10-19')->'reading_logs') v where not (v->>'is_deleted')::boolean)),false) then raise exception 'Initial page excluded from metric';end if;n:=n+1;

insert into public.external_book_references(book_id,provider,external_id,looked_up_at) values(ba,'OPEN_LIBRARY','/works/OL1W',now());
perform set_config('request.jwt.claim.sub',b::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
if not coalesce(((select count(*)=0 from public.area_modules)),false) then raise exception 'Owner isolation area_modules';end if;n:=n+1;
if not coalesce(((select count(*)=0 from public.books)),false) then raise exception 'Owner isolation books';end if;n:=n+1;
if not coalesce(((select count(*)=0 from public.reading_logs)),false) then raise exception 'Owner isolation reading_logs';end if;n:=n+1;
if not coalesce(((select count(*)=0 from public.external_book_references)),false) then raise exception 'Owner isolation external_book_references';end if;n:=n+1;
if not coalesce(((select count(*)=0 from public.goal_sources)),false) then raise exception 'Owner isolation goal_sources';end if;n:=n+1;

begin perform public.set_reading_module(aa);raise exception 'Expected rejection';exception when foreign_key_violation or check_violation or no_data_found then n:=n+1;end;

begin perform public.save_reading_book(ma,book_data);raise exception 'Expected rejection';exception when foreign_key_violation or check_violation or no_data_found then n:=n+1;end;

begin insert into public.reading_logs(book_id,read_on,pages,operation_id) values(ba,'2026-10-20',12,gen_random_uuid());raise exception 'Expected rejection';exception when foreign_key_violation or check_violation or no_data_found then n:=n+1;end;

begin insert into public.external_book_references(book_id,provider,external_id,looked_up_at) values(ba,'OPEN_LIBRARY','/works/OL2W',now());raise exception 'Expected rejection';exception when foreign_key_violation or check_violation or no_data_found then n:=n+1;end;

ab:=public.create_area('Outra área','leaf','#47D6C7');mb:=public.set_reading_module(ab);bb:=public.save_reading_book(mb,book_data);
begin perform public.save_reading_goal('2026-10-19',ab,goal_data,ba);raise exception 'Expected rejection';exception when foreign_key_violation or check_violation or no_data_found then n:=n+1;end;

perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
begin perform public.save_reading_goal('2026-10-19',aa,goal_data,bb);raise exception 'Expected rejection';exception when foreign_key_violation or check_violation or no_data_found then n:=n+1;end;

begin update public.books set user_id=b where id=ba;raise exception 'Expected rejection';exception when insufficient_privilege then n:=n+1;end;

begin update public.reading_logs set created_at=now() where id=l;raise exception 'Expected rejection';exception when insufficient_privilege then n:=n+1;end;

begin delete from public.books where id=ba;raise exception 'Expected rejection';exception when insufficient_privilege then n:=n+1;end;

perform public.set_reading_module(aa,false);
begin perform public.save_reading_log(ba,jsonb_build_object('pages',1,'read_on','2026-10-21','operation_id',gen_random_uuid()));raise exception 'Expected rejection';exception when check_violation then n:=n+1;end;

if not coalesce(((select (v->>'current_page')::int=56 from jsonb_array_elements(public.get_reading_books()) v where v->>'id'=ba::text)),false) then raise exception 'Disabled preserves history';end if;n:=n+1;

perform set_config('reading.test_assertions',n::text,true);
end; $$;
set local role anon;
do $$ declare n integer:=current_setting('reading.test_assertions')::integer;t text;begin
foreach t in array array['area_modules','books','reading_logs','external_book_references'] loop
begin execute format('select * from public.%I',t);raise exception 'Anon gained table access';exception when insufficient_privilege then n:=n+1;end;
end loop;
begin perform public.get_reading_books();raise exception 'Anon gained RPC access';exception when insufficient_privilege then n:=n+1;end;
perform set_config('reading.test_assertions',n::text,true);end; $$;
reset role;
select current_setting('reading.test_assertions')::int as passed_assertions,'All test data will be rolled back' as result;
rollback;
