begin;
alter table public.area_modules drop constraint area_modules_module_check;
alter table public.area_modules add constraint area_modules_module_check check(module in ('READING','STUDIES'));
create function public.ensure_reading_module_kind() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.area_modules where user_id=new.user_id and id=new.area_module_id and module='READING') then raise exception 'Books require a Reading module' using errcode='23514';end if;return new;
end;$$;
create trigger books_module_kind before insert or update on public.books for each row execute function public.ensure_reading_module_kind();
revoke all on function public.ensure_reading_module_kind() from public,anon,authenticated;

create table public.study_subjects (
 id uuid primary key, user_id uuid not null default auth.uid(), area_id uuid not null,
 title text not null check(char_length(btrim(title)) between 1 and 160),
 target_minutes integer check(target_minutes between 1 and 1000000), archived boolean not null default false,
 objective_id uuid, created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,
 foreign key(user_id,objective_id) references public.objectives(user_id,id) on delete restrict
);
create table public.study_sessions (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,subject_id uuid not null,
 studied_on date not null check(studied_on between date '1900-01-01' and date '9999-12-31'),
 minutes integer not null check(minutes between 1 and 1440), notes text not null default '' check(char_length(notes)<=2000),
 is_deleted boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 foreign key(user_id,area_id,subject_id) references public.study_subjects(user_id,area_id,id) on delete restrict
);
create index study_sessions_owner_date on public.study_sessions(user_id,area_id,studied_on) where not is_deleted;
create function public.touch_specialized_row() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if to_jsonb(new)->>'objective_id' is not null and not exists(select 1 from public.objectives where user_id=new.user_id and id=(to_jsonb(new)->>'objective_id')::uuid and (area_id is null or area_id=new.area_id)) then raise exception 'Objective from another area' using errcode='23514';end if;
 new.updated_at:=clock_timestamp();return new;
end; $$;
revoke all on function public.touch_specialized_row() from public,anon,authenticated;
do $$ declare t text; begin foreach t in array array['study_subjects','study_sessions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('alter table public.%I force row level security',t);
 execute format('create policy owner on public.%I for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid())',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create trigger touch before insert or update on public.%I for each row execute function public.touch_specialized_row()',t);
end loop;end $$;
grant insert(id,user_id,area_id,title,target_minutes,archived,objective_id),update(title,target_minutes,archived,objective_id) on public.study_subjects to authenticated;
grant insert(id,user_id,area_id,subject_id,studied_on,minutes,notes,is_deleted),update(subject_id,studied_on,minutes,notes,is_deleted) on public.study_sessions to authenticated;

create function public.save_study_subject(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.study_subjects; begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
 select * into r from public.study_subjects where user_id=auth.uid() and id=p_id;
 if found then
 if (r.area_id,r.title,r.target_minutes,r.archived,r.objective_id) is distinct from ((p_item->>'area_id')::uuid,btrim(p_item->>'title'),(p_item->>'target_minutes')::integer,(p_item->>'archived')::boolean,(p_item->>'objective_id')::uuid) then raise exception 'Key reused' using errcode='22023';end if;
 return p_id;end if;
 insert into public.study_subjects(id,area_id,title,target_minutes,archived,objective_id) values(p_id,(p_item->>'area_id')::uuid,btrim(p_item->>'title'),(p_item->>'target_minutes')::integer,(p_item->>'archived')::boolean,(p_item->>'objective_id')::uuid);
 else
 update public.study_subjects set title=btrim(p_item->>'title'),target_minutes=(p_item->>'target_minutes')::integer,archived=(p_item->>'archived')::boolean,objective_id=(p_item->>'objective_id')::uuid where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
 if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
create function public.save_study_session(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.study_sessions; begin
 if (p_item->>'studied_on')::date > (select (now() at time zone timezone)::date from public.profiles where user_id=auth.uid()) then raise exception 'Future session' using errcode='23514';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
 select * into r from public.study_sessions where user_id=auth.uid() and id=p_id;
 if found then
 if (r.area_id,r.subject_id,r.studied_on,r.minutes,r.notes,r.is_deleted) is distinct from ((p_item->>'area_id')::uuid,(p_item->>'subject_id')::uuid,(p_item->>'studied_on')::date,(p_item->>'minutes')::integer,p_item->>'notes',(p_item->>'is_deleted')::boolean) then raise exception 'Key reused' using errcode='22023';end if;return p_id;end if;
 insert into public.study_sessions(id,area_id,subject_id,studied_on,minutes,notes,is_deleted) values(p_id,(p_item->>'area_id')::uuid,(p_item->>'subject_id')::uuid,(p_item->>'studied_on')::date,(p_item->>'minutes')::integer,p_item->>'notes',(p_item->>'is_deleted')::boolean);
 else
 update public.study_sessions set subject_id=(p_item->>'subject_id')::uuid,studied_on=(p_item->>'studied_on')::date,minutes=(p_item->>'minutes')::integer,notes=p_item->>'notes',is_deleted=(p_item->>'is_deleted')::boolean where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
 if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
alter table public.goal_sources drop constraint goal_sources_configuration;
alter table public.goal_sources add constraint goal_sources_configuration check(
 (kind='MANUAL' and module is null and metric is null and scope is null and area_module_id is null and book_id is null)
 or (kind='MODULE' and area_module_id is not null and module is not null and metric is not null and scope is not null and (
 (module='READING' and metric='PAGES_READ' and ((scope='ALL_BOOKS' and book_id is null) or (scope='BOOK' and book_id is not null)))
 or (module='STUDIES' and metric='MINUTES_STUDIED' and scope='ALL_SUBJECTS' and book_id is null)))
);
create or replace function public.validate_reading_source() returns trigger language plpgsql security invoker set search_path='' as $$
declare g public.weekly_goals;begin
 select * into strict g from public.weekly_goals where user_id=new.user_id and id=new.goal_id for update;
 if tg_op='UPDATE' and (new.kind,new.module,new.metric,new.scope,new.area_module_id,new.book_id) is distinct from (old.kind,old.module,old.metric,old.scope,old.area_module_id,old.book_id) then
 if old.kind='MODULE' or exists(select 1 from public.goal_records where user_id=new.user_id and goal_id=new.goal_id) then raise exception 'Canonical source is locked' using errcode='22023';end if;end if;
 if new.kind='MODULE' then
 if g.type<>'QUANTITY' or (new.module='READING' and g.unit<>'páginas') or (new.module='STUDIES' and g.unit<>'minutos') then raise exception 'Invalid module unit' using errcode='23514';end if;
 perform 1 from public.area_modules where user_id=new.user_id and id=new.area_module_id and area_id=g.area_id and module=new.module and enabled for share;
 if not found then raise exception 'Module must belong to goal area' using errcode='23514';end if;end if;return new;
end;$$;
create function public.save_study_goal(p_start_date date,p_area_id uuid,p_goal jsonb,p_goal_id uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare mid uuid;gid uuid;begin
 insert into public.area_modules(user_id,area_id,module) values(auth.uid(),p_area_id,'STUDIES') on conflict(user_id,area_id,module) do update set enabled=true returning id into mid;
 gid:=public.save_weekly_goal(p_start_date,p_area_id,p_goal||jsonb_build_object('type','QUANTITY','unit','minutos','basis','WEEKLY','frequency_mode','OCCURRENCES','expected_observations',7,'observation_unit','dias'),p_goal_id);
 update public.goal_sources set kind='MODULE',module='STUDIES',metric='MINUTES_STUDIED',scope='ALL_SUBJECTS',area_module_id=mid,book_id=null where user_id=auth.uid() and goal_id=gid;return gid;
end;$$;
create or replace function public.validate_weekly_goal() returns trigger language plpgsql security invoker set search_path='' as $$
declare source_module text;begin
 perform 1 from public.area_weekly_plans where user_id=new.user_id and id=new.plan_id for update;
 if new.objective_id is not null and not exists(select 1 from public.objectives where user_id=new.user_id and id=new.objective_id and (area_id is null or area_id=new.area_id)) then raise exception 'Objective must belong to area' using errcode='23514';end if;
 if tg_op='UPDATE' and (new.type,new.unit,new.basis,new.frequency_mode) is distinct from (old.type,old.unit,old.basis,old.frequency_mode) and exists(select 1 from public.goal_records where user_id=old.user_id and goal_id=old.id) then raise exception 'Measurement locked' using errcode='22023';end if;
 select module into source_module from public.goal_sources where user_id=new.user_id and goal_id=new.id and kind='MODULE';
 if source_module is not null and (new.type<>'QUANTITY' or (source_module='READING' and new.unit<>'páginas') or (source_module='STUDIES' and (new.unit<>'minutos' or new.basis<>'WEEKLY'))) then raise exception 'Invalid module measurement' using errcode='23514';end if;
 new.updated_at:=clock_timestamp();return new;
end;$$;
create function public.get_studies_data(p_area_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('subjects',coalesce((select jsonb_agg(s order by s.created_at,s.id) from public.study_subjects s where s.user_id=auth.uid() and s.area_id=p_area_id),'[]'::jsonb),
 'sessions',coalesce((select jsonb_agg(s order by s.studied_on desc,s.created_at desc,s.id) from public.study_sessions s where s.user_id=auth.uid() and s.area_id=p_area_id),'[]'::jsonb));
$$;
create function public.get_study_planning_data() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(s),'[]'::jsonb) from public.study_sessions s where s.user_id=auth.uid() and not s.is_deleted;
$$;
revoke all on function public.save_study_subject(jsonb,uuid,timestamptz),public.save_study_session(jsonb,uuid,timestamptz),public.save_study_goal(date,uuid,jsonb,uuid),public.get_studies_data(uuid),public.get_study_planning_data() from public,anon;
grant execute on function public.save_study_subject(jsonb,uuid,timestamptz),public.save_study_session(jsonb,uuid,timestamptz),public.save_study_goal(date,uuid,jsonb,uuid),public.get_studies_data(uuid),public.get_study_planning_data() to authenticated;
commit;
