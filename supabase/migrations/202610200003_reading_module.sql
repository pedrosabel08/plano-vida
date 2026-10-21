begin;
create table public.area_modules (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references public.profiles(user_id) on delete restrict,
 area_id uuid not null, module text not null default 'READING' check(module='READING'), enabled boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,id),unique(user_id,area_id,module),foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict
);
create table public.books (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), area_module_id uuid not null,
 title text not null check(title=btrim(title) and char_length(title) between 1 and 200), authors text[] not null default '{}',
 total_pages integer check(total_pages>0), initial_tracking_page integer not null default 0 check(initial_tracking_page>=0),
 cover_url text check(cover_url is null or (cover_url like 'https://%' and char_length(cover_url)<=2048)),
 isbn_10 text check(isbn_10 is null or isbn_10 ~ '^[0-9]{9}[0-9X]$'), isbn_13 text check(isbn_13 is null or isbn_13 ~ '^[0-9]{13}$'),
 status text not null default 'WANT_TO_READ' check(status in ('WANT_TO_READ','READING','FINISHED','ABANDONED')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,id), unique(user_id,id,area_module_id),
 foreign key(user_id,area_module_id) references public.area_modules(user_id,id) on delete restrict,
 check(total_pages is null or initial_tracking_page<=total_pages),check(cardinality(authors)<=20)
);
create index books_owner_module on public.books(user_id,area_module_id);
create table public.reading_logs (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),book_id uuid not null,
 read_on date not null check(read_on between date '1900-01-01' and date '9999-12-31'), pages integer not null check(pages>0),
 operation_id uuid not null, is_deleted boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(user_id,operation_id),foreign key(user_id,book_id) references public.books(user_id,id) on delete restrict
);
create index reading_logs_owner_book_date on public.reading_logs(user_id,book_id,read_on);
create index reading_logs_owner_date on public.reading_logs(user_id,read_on) where not is_deleted;
create table public.external_book_references (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),book_id uuid not null,
 provider text not null check(provider='OPEN_LIBRARY'),external_id text not null check(external_id ~ '^/works/OL[0-9]+W$'),
 looked_up_at timestamptz not null, imported_at timestamptz not null default now(),
 metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=4096),
 unique(user_id,book_id,provider,external_id),foreign key(user_id,book_id) references public.books(user_id,id) on delete restrict
);
create index external_books_owner_book on public.external_book_references(user_id,book_id);

create function public.validate_reading_book() returns trigger language plpgsql security invoker set search_path='' as $$
declare current_pages bigint; a text;
begin
 perform 1 from public.area_modules where user_id=new.user_id and id=new.area_module_id for share;
 if tg_op='INSERT' and not exists(select 1 from public.area_modules where user_id=new.user_id and id=new.area_module_id and enabled) then raise exception 'Reading module is disabled' using errcode='23514';end if;
 foreach a in array new.authors loop
  if a is null or char_length(btrim(a)) not between 1 and 160 then raise exception 'Invalid author' using errcode='23514';end if;
 end loop;
 select new.initial_tracking_page+coalesce(sum(pages),0) into current_pages from public.reading_logs where user_id=new.user_id and book_id=new.id and not is_deleted;
 if current_pages>2147483647 or (new.total_pages is not null and current_pages>new.total_pages) then raise exception 'Total pages cannot be below derived progress' using errcode='23514';end if;
 new.updated_at:=clock_timestamp();return new;
end; $$;
create trigger books_validate before insert or update on public.books for each row execute function public.validate_reading_book();

create function public.validate_reading_log() returns trigger language plpgsql security invoker set search_path='' as $$
declare b public.books; current_pages bigint;
begin
 select * into strict b from public.books where user_id=new.user_id and id=new.book_id for update;
 if tg_op='INSERT' and not exists(select 1 from public.area_modules where user_id=b.user_id and id=b.area_module_id and enabled) then raise exception 'Reading module is disabled' using errcode='23514';end if;
 select b.initial_tracking_page+coalesce(sum(pages),0)+(case when new.is_deleted then 0 else new.pages end) into current_pages from public.reading_logs where user_id=new.user_id and book_id=new.book_id and id<>new.id and not is_deleted;
 if current_pages>2147483647 or (b.total_pages is not null and current_pages>b.total_pages) then raise exception 'Reading exceeds total pages' using errcode='23514';end if;
 new.updated_at:=clock_timestamp();return new;
end; $$;
create trigger reading_logs_validate before insert or update on public.reading_logs for each row execute function public.validate_reading_log();

alter table public.goal_sources drop constraint goal_sources_kind_check;
alter table public.goal_sources add column module text,add column metric text,add column scope text,add column area_module_id uuid,add column book_id uuid;
alter table public.goal_sources add constraint goal_sources_configuration check(
 (kind='MANUAL' and module is null and metric is null and scope is null and area_module_id is null and book_id is null)
 or (kind='MODULE' and module is not null and module='READING' and metric is not null and metric='PAGES_READ' and area_module_id is not null and scope is not null and ((scope='ALL_BOOKS' and book_id is null) or (scope='BOOK' and book_id is not null)))
);
alter table public.goal_sources add foreign key(user_id,area_module_id) references public.area_modules(user_id,id) on delete restrict;
alter table public.goal_sources add foreign key(user_id,book_id,area_module_id) references public.books(user_id,id,area_module_id) on delete restrict;
create index goal_sources_owner_module on public.goal_sources(user_id,area_module_id);
create index goal_sources_owner_book on public.goal_sources(user_id,book_id);

create function public.validate_reading_source() returns trigger language plpgsql security invoker set search_path='' as $$
declare g public.weekly_goals;
begin
 select * into strict g from public.weekly_goals where user_id=new.user_id and id=new.goal_id for update;
 if tg_op='UPDATE' and (new.kind,new.module,new.metric,new.scope,new.area_module_id,new.book_id) is distinct from (old.kind,old.module,old.metric,old.scope,old.area_module_id,old.book_id) then
  if old.kind='MODULE' or exists(select 1 from public.goal_records where user_id=new.user_id and goal_id=new.goal_id) then raise exception 'Canonical source is locked; create another goal' using errcode='22023';end if;
 end if;
 if new.kind='MODULE' then
  if g.type<>'QUANTITY' or g.unit<>'páginas' then raise exception 'Reading requires quantity in pages' using errcode='23514';end if;
  perform 1 from public.area_modules where user_id=new.user_id and id=new.area_module_id and area_id=g.area_id and enabled for share;
  if not found then raise exception 'Reading module must belong to the goal area and be enabled' using errcode='23514';end if;
 end if;return new;
end; $$;
create trigger goal_sources_validate before insert or update on public.goal_sources for each row execute function public.validate_reading_source();
create policy goal_sources_update_own on public.goal_sources for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant update(kind,module,metric,scope,area_module_id,book_id) on public.goal_sources to authenticated;

create or replace function public.validate_weekly_goal() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.area_weekly_plans where user_id=new.user_id and id=new.plan_id for update;
 if new.objective_id is not null and not exists(select 1 from public.objectives where user_id=new.user_id and id=new.objective_id and (area_id is null or area_id=new.area_id)) then
  raise exception 'Objective must belong to this owner and area or be unassigned' using errcode='23514';
 end if;
 if tg_op='UPDATE' and (new.type,new.unit,new.basis,new.frequency_mode) is distinct from (old.type,old.unit,old.basis,old.frequency_mode)
  and exists(select 1 from public.goal_records where user_id=old.user_id and goal_id=old.id) then
  raise exception 'Measurement configuration is locked after records exist' using errcode='22023';
 end if;
 if exists(select 1 from public.goal_sources where user_id=new.user_id and goal_id=new.id and kind='MODULE') and (new.type<>'QUANTITY' or new.unit<>'páginas') then raise exception 'Reading requires quantity in pages' using errcode='23514';end if;
 new.updated_at:=clock_timestamp();return new;
end; $$;


create or replace function public.validate_goal_record() returns trigger language plpgsql security invoker set search_path='' as $$
declare g public.weekly_goals; w public.weeks;
begin
 select * into strict g from public.weekly_goals where user_id=new.user_id and id=new.goal_id for update;
 perform 1 from public.goal_sources where user_id=new.user_id and goal_id=new.goal_id and kind='MANUAL' for update;
 if not found then raise exception 'Manual records cannot measure a module goal' using errcode='23514';end if;
 select * into strict w from public.weeks where user_id=g.user_id and id=g.week_id;
 if new.recorded_on<w.start_date or new.recorded_on>w.end_date then raise exception 'Record date must be within the goal week' using errcode='23514';end if;
 if g.type='FREQUENCY' and g.frequency_mode='DISTINCT_DAYS' and new.value<>1 then raise exception 'Distinct day records require value 1' using errcode='23514';end if;
 new.updated_at:=clock_timestamp();return new;
end; $$;



do $$ declare t text;begin
 foreach t in array array['area_modules','books','reading_logs','external_book_references'] loop
 execute format('alter table public.%I enable row level security',t);execute format('alter table public.%I force row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);
 execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid())=user_id)',t||'_select_own',t);
 execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t||'_insert_own',t);
 end loop;
 foreach t in array array['area_modules','books','reading_logs'] loop
 execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t||'_update_own',t);
 end loop;
end; $$;
grant insert(user_id,area_id,module),update(enabled) on public.area_modules to authenticated;
grant insert(user_id,area_module_id,title,authors,total_pages,initial_tracking_page,cover_url,isbn_10,isbn_13,status),update(title,authors,total_pages,initial_tracking_page,cover_url,isbn_10,isbn_13,status) on public.books to authenticated;
grant insert(user_id,book_id,read_on,pages,operation_id),update(read_on,pages,is_deleted) on public.reading_logs to authenticated;
grant insert(user_id,book_id,provider,external_id,looked_up_at,metadata) on public.external_book_references to authenticated;

create function public.set_reading_module(p_area_id uuid,p_enabled boolean default true) returns uuid language plpgsql security invoker set search_path='' as $$
declare result_id uuid;
begin
 insert into public.area_modules(user_id,area_id,module) values(auth.uid(),p_area_id,'READING') on conflict(user_id,area_id,module) do nothing;
 update public.area_modules set enabled=p_enabled where user_id=auth.uid() and area_id=p_area_id and module='READING' returning id into strict result_id;return result_id;
end; $$;
create function public.save_reading_book(p_module_id uuid,p_book jsonb,p_book_id uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare result_id uuid; aa text[];
begin
 select coalesce(array_agg(btrim(value)),'{}'::text[]) into aa from jsonb_array_elements_text(p_book->'authors');
 if p_book_id is null then
 insert into public.books(user_id,area_module_id,title,authors,total_pages,initial_tracking_page,cover_url,isbn_10,isbn_13,status)
 values(auth.uid(),p_module_id,btrim(p_book->>'title'),aa,nullif(p_book->>'total_pages','')::integer,(p_book->>'initial_tracking_page')::integer,nullif(p_book->>'cover_url',''),nullif(p_book->>'isbn_10',''),nullif(p_book->>'isbn_13',''),p_book->>'status') returning id into result_id;
 if p_book->'external_reference' is not null and p_book->'external_reference'<>'null'::jsonb then
 insert into public.external_book_references(user_id,book_id,provider,external_id,looked_up_at,metadata)
 values(auth.uid(),result_id,p_book->'external_reference'->>'provider',p_book->'external_reference'->>'external_id',(p_book->'external_reference'->>'looked_up_at')::timestamptz,coalesce(p_book->'external_reference'->'metadata','{}'::jsonb));end if;
 else
 update public.books set title=btrim(p_book->>'title'),authors=aa,total_pages=nullif(p_book->>'total_pages','')::integer,initial_tracking_page=(p_book->>'initial_tracking_page')::integer,cover_url=nullif(p_book->>'cover_url',''),isbn_10=nullif(p_book->>'isbn_10',''),isbn_13=nullif(p_book->>'isbn_13',''),status=p_book->>'status'
 where user_id=auth.uid() and id=p_book_id and area_module_id=p_module_id and updated_at=(p_book->>'expected_updated_at')::timestamptz returning id into result_id;
 if result_id is null then raise exception 'Book changed; reload before editing' using errcode='40001';end if;
 end if;return result_id;
end; $$;
create function public.save_reading_log(p_book_id uuid,p_log jsonb,p_log_id uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare b public.books;existing public.reading_logs;result_id uuid;d date:=(p_log->>'read_on')::date;v integer:=(p_log->>'pages')::integer;
begin
 select * into strict b from public.books where user_id=auth.uid() and id=p_book_id for update;
 if p_log_id is null then
 select * into existing from public.reading_logs where user_id=auth.uid() and operation_id=(p_log->>'operation_id')::uuid;
 if found then
 if (existing.book_id,existing.read_on,existing.pages) is distinct from (p_book_id,d,v) then raise exception 'Operation key reused' using errcode='22023';end if;return existing.id;end if;
 insert into public.reading_logs(user_id,book_id,read_on,pages,operation_id) values(auth.uid(),p_book_id,d,v,(p_log->>'operation_id')::uuid) returning id into result_id;
 else
 update public.reading_logs set read_on=d,pages=v,is_deleted=coalesce((p_log->>'is_deleted')::boolean,false)
 where user_id=auth.uid() and id=p_log_id and book_id=p_book_id and not is_deleted and updated_at=(p_log->>'expected_updated_at')::timestamptz returning id into result_id;
 if result_id is null then raise exception 'Log changed; reload before editing' using errcode='40001';end if;
 end if;return result_id;
end; $$;
create function public.save_reading_goal(p_start_date date,p_area_id uuid,p_goal jsonb,p_book_id uuid default null,p_goal_id uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare mid uuid;gid uuid;
begin
 select id into strict mid from public.area_modules where user_id=auth.uid() and area_id=p_area_id and module='READING' and enabled for share;
 gid:=public.save_weekly_goal(p_start_date,p_area_id,p_goal||jsonb_build_object('type','QUANTITY','unit','páginas','frequency_mode','OCCURRENCES','expected_observations',7,'observation_unit','dias'),p_goal_id);
 update public.goal_sources set kind='MODULE',module='READING',metric='PAGES_READ',scope=case when p_book_id is null then 'ALL_BOOKS' else 'BOOK' end,area_module_id=mid,book_id=p_book_id where user_id=auth.uid() and goal_id=gid;return gid;
end; $$;
create function public.get_reading_books() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(b)||jsonb_build_object('current_page',(b.initial_tracking_page+coalesce(r.pages,0))::integer) order by b.created_at,b.id),'[]'::jsonb)
 from public.books b left join lateral(select sum(pages) as pages from public.reading_logs r where r.user_id=b.user_id and r.book_id=b.id and not r.is_deleted) r on true where b.user_id=auth.uid();
$$;
create function public.get_reading_data(p_area_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('module',(select to_jsonb(m) from public.area_modules m where user_id=auth.uid() and area_id=p_area_id and module='READING'),
 'books',coalesce((select jsonb_agg(b) from jsonb_array_elements(public.get_reading_books()) b where b->>'area_module_id' in (select id::text from public.area_modules where user_id=auth.uid() and area_id=p_area_id)),'[]'::jsonb),
 'logs',coalesce((select jsonb_agg(to_jsonb(l) order by l.read_on desc,l.created_at desc,l.id) from public.reading_logs l join public.books b on b.user_id=l.user_id and b.id=l.book_id join public.area_modules m on m.user_id=b.user_id and m.id=b.area_module_id where l.user_id=auth.uid() and m.area_id=p_area_id),'[]'::jsonb),
 'references',coalesce((select jsonb_agg(to_jsonb(e)) from public.external_book_references e join public.books b on b.user_id=e.user_id and b.id=e.book_id join public.area_modules m on m.user_id=b.user_id and m.id=b.area_module_id where e.user_id=auth.uid() and m.area_id=p_area_id),'[]'::jsonb));
$$;
create or replace function public.get_planning_data(p_start_date date) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'area_modules',coalesce((select jsonb_agg(to_jsonb(m)) from public.area_modules m where user_id=auth.uid()),'[]'::jsonb),
 'reading_books',public.get_reading_books(),
 'reading_logs',coalesce((select jsonb_agg(to_jsonb(l)) from public.reading_logs l join public.weeks w on w.user_id=l.user_id and w.start_date=p_start_date where l.user_id=auth.uid() and l.read_on between w.start_date and w.end_date),'[]'::jsonb),
 'week',(select to_jsonb(w) from public.weeks w where user_id=auth.uid() and start_date=p_start_date),
 'plans',coalesce((select jsonb_agg(to_jsonb(p)) from public.area_weekly_plans p join public.weeks w on w.id=p.week_id and w.user_id=p.user_id where p.user_id=auth.uid() and w.start_date=p_start_date),'[]'::jsonb),
 'goals',coalesce((select jsonb_agg(to_jsonb(g)||jsonb_build_object('target',g.target::text) order by g.created_at,g.id) from public.weekly_goals g join public.weeks w on w.id=g.week_id and w.user_id=g.user_id where g.user_id=auth.uid() and w.start_date=p_start_date),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(to_jsonb(s)) from public.goal_sources s join public.weekly_goals g on g.id=s.goal_id and g.user_id=s.user_id join public.weeks w on w.id=g.week_id and w.user_id=g.user_id where s.user_id=auth.uid() and w.start_date=p_start_date),'[]'::jsonb),
 'records',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('value',r.value::text) order by r.recorded_on,r.created_at,r.id) from public.goal_records r join public.weekly_goals g on g.id=r.goal_id and g.user_id=r.user_id join public.weeks w on w.id=g.week_id and w.user_id=g.user_id where r.user_id=auth.uid() and w.start_date=p_start_date),'[]'::jsonb)
 );
$$;


revoke all on function public.validate_reading_book(),public.validate_reading_log(),public.validate_reading_source() from public,anon,authenticated;
revoke all on function public.set_reading_module(uuid,boolean),public.save_reading_book(uuid,jsonb,uuid),public.save_reading_log(uuid,jsonb,uuid),public.save_reading_goal(date,uuid,jsonb,uuid,uuid),public.get_reading_books(),public.get_reading_data(uuid) from public,anon;
grant execute on function public.set_reading_module(uuid,boolean),public.save_reading_book(uuid,jsonb,uuid),public.save_reading_log(uuid,jsonb,uuid),public.save_reading_goal(date,uuid,jsonb,uuid,uuid),public.get_reading_books(),public.get_reading_data(uuid) to authenticated;
create function public.touch_reading_module() returns trigger language plpgsql security invoker set search_path='' as $$ begin new.updated_at:=clock_timestamp();return new;end; $$;
create trigger reading_module_timestamp before update on public.area_modules for each row execute function public.touch_reading_module();
revoke all on function public.touch_reading_module() from public,anon,authenticated;
commit;
