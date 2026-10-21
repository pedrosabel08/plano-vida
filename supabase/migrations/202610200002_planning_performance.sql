begin;

create table public.objectives (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references public.profiles(user_id) on delete restrict,
 area_id uuid, title text not null check (title=btrim(title) and char_length(title) between 1 and 160),
 type text not null check (type in ('QUANTITATIVE','PERCENTAGE','QUALITATIVE')),
 target numeric, current_value numeric, unit text,
 due_date date, state text not null default 'ACTIVE' check (state in ('ACTIVE','COMPLETED')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,
 check ((type='QUALITATIVE' and target is null and current_value is null and unit is null)
   or (type='QUANTITATIVE' and target is not null and target>0 and target<'Infinity'::numeric and current_value is not null and current_value>=0 and current_value<'Infinity'::numeric and unit is not null and char_length(btrim(unit)) between 1 and 40)
   or (type='PERCENTAGE' and target is not null and unit is not null and target=100 and current_value is not null and current_value between 0 and 100 and unit='%'))
);

create index objectives_owner_area on public.objectives (user_id, area_id);

create table public.weeks (
    id uuid primary key default gen_random_uuid (),
    user_id uuid not null default auth.uid () references public.profiles (user_id) on delete restrict,
    start_date date not null check (
        extract(
            isodow
            from start_date
        ) = 1
        and start_date between date '1900-01-01' and date  '9999-12-24'
    ),
    end_date date not null,
    timezone text not null,
    starts_at timestamptz not null,
    ends_at_exclusive timestamptz not null,
    created_at timestamptz not null default now(),
    unique (user_id, start_date),
    unique (user_id, id),
    check (
        end_date = start_date + 6
        and ends_at_exclusive > starts_at
    )
);

create function public.set_week_context() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 select timezone into strict new.timezone from public.profiles where user_id=new.user_id;
 new.end_date:=new.start_date+6;
 new.starts_at:=new.start_date::timestamp at time zone new.timezone;
 new.ends_at_exclusive:=(new.start_date+7)::timestamp at time zone new.timezone;
 return new;
end; $$;

create trigger weeks_context before insert on public.weeks for each row execute function public.set_week_context();

create table public.area_weekly_plans (
    id uuid primary key default gen_random_uuid (),
    user_id uuid not null default auth.uid () references public.profiles (user_id) on delete restrict,
    week_id uuid not null,
    area_id uuid not null,
    state text not null default 'UNPLANNED' check (
        state in ('UNPLANNED', 'PLANNED')
    ),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, week_id, area_id),
    unique (user_id, id, week_id, area_id),
    foreign key (user_id, week_id) references public.weeks (user_id, id) on delete restrict,
    foreign key (user_id, area_id) references public.areas (user_id, id) on delete restrict
);

create table public.weekly_goals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references public.profiles(user_id) on delete restrict,
 week_id uuid not null, area_id uuid not null, plan_id uuid not null, objective_id uuid,
 title text not null check(title=btrim(title) and char_length(title) between 1 and 160),
 type text not null check(type in ('QUANTITY','FREQUENCY','AVERAGE','COMPLETION')),
 unit text not null check(char_length(btrim(unit)) between 1 and 40),
 target numeric not null check(target>0 and target<'Infinity'::numeric),
 basis text not null default 'WEEKLY' check(basis in ('WEEKLY','DAILY')),
 frequency_mode text not null default 'OCCURRENCES' check(frequency_mode in ('OCCURRENCES','DISTINCT_DAYS')),
 expected_observations smallint not null default 7 check(expected_observations between 1 and 7),
 observation_unit text not null default 'dias' check(char_length(btrim(observation_unit)) between 1 and 40),
 state text not null default 'ACTIVE' check(state in ('ACTIVE','CANCELLED')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,id), unique(user_id,id,type),
 foreign key(user_id,plan_id,week_id,area_id) references public.area_weekly_plans(user_id,id,week_id,area_id) on delete restrict,
 foreign key(user_id,objective_id) references public.objectives(user_id,id) on delete restrict,
 check(type in ('QUANTITY','FREQUENCY') or basis='WEEKLY'),
 check(type<>'FREQUENCY' or target=trunc(target)),
 check(type<>'COMPLETION' or target=1),
 check(frequency_mode='OCCURRENCES' or (type='FREQUENCY' and target*(case when basis='DAILY' then 7 else 1 end)<=7))
);

create index weekly_goals_owner_week_area on public.weekly_goals (user_id, week_id, area_id);

create index weekly_goals_owner_objective on public.weekly_goals (user_id, objective_id);

-- One canonical binding. Other kinds are reserved, not enabled in this phase.
create table public.goal_sources (
    goal_id uuid primary key,
    user_id uuid not null default auth.uid (),
    kind text not null default 'MANUAL' check (
        kind in ('MANUAL', 'MODULE', 'ACTION')
        and kind = 'MANUAL'
    ),
    created_at timestamptz not null default now(),
    unique (user_id, goal_id),
    foreign key (user_id, goal_id) references public.weekly_goals (user_id, id) on delete restrict
);

create table public.goal_records (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), goal_id uuid not null,
 goal_type text not null, recorded_on date not null, value numeric, completed boolean,
 operation_id uuid not null, is_deleted boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,operation_id),
 foreign key(user_id,goal_id,goal_type) references public.weekly_goals(user_id,id,type) on delete restrict,
 foreign key(user_id,goal_id) references public.goal_sources(user_id,goal_id) on delete restrict,
 check ((goal_type='COMPLETION' and value is null and completed is not null)
  or (goal_type in ('QUANTITY','FREQUENCY','AVERAGE') and value is not null and value>=0 and value<'Infinity'::numeric and completed is null)),
 check(goal_type<>'FREQUENCY' or value=trunc(value))
);

create index goal_records_owner_goal_date on public.goal_records (user_id, goal_id, recorded_on);

create unique index goal_records_one_daily_average on public.goal_records (user_id, goal_id, recorded_on)
where
    goal_type = 'AVERAGE'
    and not is_deleted;

create unique index goal_records_one_completion on public.goal_records (user_id, goal_id)
where
    goal_type = 'COMPLETION'
    and not is_deleted;

create function public.validate_weekly_goal() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.area_weekly_plans where user_id=new.user_id and id=new.plan_id for update;
 if new.objective_id is not null and not exists(select 1 from public.objectives where user_id=new.user_id and id=new.objective_id and (area_id is null or area_id=new.area_id)) then
  raise exception 'Objective must belong to this owner and area or be unassigned' using errcode='23514';
 end if;
 if tg_op='UPDATE' and (new.type,new.unit,new.basis,new.frequency_mode) is distinct from (old.type,old.unit,old.basis,old.frequency_mode)
  and exists(select 1 from public.goal_records where user_id=old.user_id and goal_id=old.id) then
  raise exception 'Measurement configuration is locked after records exist' using errcode='22023';
 end if;
 new.updated_at:=clock_timestamp();return new;
end; $$;

create trigger weekly_goals_validate before insert or update on public.weekly_goals for each row execute function public.validate_weekly_goal();

create function public.create_manual_goal_source() returns trigger language plpgsql security invoker set search_path='' as $$
begin insert into public.goal_sources(user_id,goal_id,kind) values(new.user_id,new.id,'MANUAL');return new;end; $$;

create trigger weekly_goals_source after insert on public.weekly_goals for each row execute function public.create_manual_goal_source();

create function public.sync_area_plan() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 update public.area_weekly_plans set state=case when exists(select 1 from public.weekly_goals where user_id=new.user_id and plan_id=new.plan_id and state='ACTIVE') then 'PLANNED' else 'UNPLANNED' end
 where user_id=new.user_id and id=new.plan_id;return new;
end; $$;

create trigger weekly_goals_plan after insert or update on public.weekly_goals for each row execute function public.sync_area_plan();

create function public.validate_area_plan() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.state is distinct from (case when exists(select 1 from public.weekly_goals where user_id=new.user_id and plan_id=new.id and state='ACTIVE') then 'PLANNED' else 'UNPLANNED' end) then
  raise exception 'Plan state must match its active goals' using errcode='23514';
 end if;new.updated_at:=clock_timestamp();return new;
end; $$;

create trigger area_plan_validate before insert or update on public.area_weekly_plans for each row execute function public.validate_area_plan();

create function public.validate_objective() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and new.area_id is distinct from old.area_id and exists(select 1 from public.weekly_goals where user_id=new.user_id and objective_id=new.id and new.area_id is not null and area_id<>new.area_id) then
  raise exception 'Objective is linked to goals in another area' using errcode='23514';
 end if;new.updated_at:=clock_timestamp();return new;
end; $$;

create trigger objectives_validate before insert or update on public.objectives for each row execute function public.validate_objective();

create function public.validate_goal_record() returns trigger language plpgsql security invoker set search_path='' as $$
declare g public.weekly_goals; w public.weeks;
begin
 select * into strict g from public.weekly_goals where user_id=new.user_id and id=new.goal_id for update;
 select * into strict w from public.weeks where user_id=g.user_id and id=g.week_id;
 if new.recorded_on<w.start_date or new.recorded_on>w.end_date then raise exception 'Record date must be within the goal week' using errcode='23514';end if;
 if g.type='FREQUENCY' and g.frequency_mode='DISTINCT_DAYS' and new.value<>1 then raise exception 'Distinct day records require value 1' using errcode='23514';end if;
 new.updated_at:=clock_timestamp();return new;
end; $$;

create trigger goal_records_validate before insert or update on public.goal_records for each row execute function public.validate_goal_record();

-- Explicit column grants keep identities and period context immutable for clients.
do $$ declare t text;begin
 foreach t in array array['objectives','weeks','area_weekly_plans','weekly_goals','goal_sources','goal_records'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('alter table public.%I force row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid())=user_id)',t||'_select_own',t);
  execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t||'_insert_own',t);
 end loop;
 foreach t in array array['objectives','area_weekly_plans','weekly_goals','goal_records'] loop
  execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t||'_update_own',t);
 end loop;
end; $$;

grant
insert (
        user_id,
        area_id,
        title,
        type,
        target,
        current_value,
        unit,
        due_date,
        state
    ),
update (
    area_id,
    title,
    type,
    target,
    current_value,
    unit,
    due_date,
    state
),
delete on public.objectives to authenticated;

create policy objectives_delete_own on public.objectives for delete to authenticated using (
    (
        select auth.uid ()
    ) = user_id
);

grant insert (user_id, start_date) on public.weeks to authenticated;

grant
insert (user_id, week_id, area_id),
update (state) on public.area_weekly_plans to authenticated;

grant insert(user_id,week_id,area_id,plan_id,objective_id,title,type,unit,target,basis,frequency_mode,expected_observations,observation_unit,state),update(objective_id,title,type,unit,target,basis,frequency_mode,expected_observations,observation_unit,state) on public.weekly_goals to authenticated;

grant
insert (user_id, goal_id, kind) on public.goal_sources to authenticated;

grant
insert (
        user_id,
        goal_id,
        goal_type,
        recorded_on,
        value,
        completed,
        operation_id
    ),
update (
    recorded_on,
    value,
    completed,
    is_deleted
) on public.goal_records to authenticated;

create function public.ensure_planning_week(p_start_date date) returns uuid language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=auth.uid(); result_id uuid;
begin
 if owner_id is null then raise exception 'Authentication required' using errcode='42501';end if;
 insert into public.weeks(user_id,start_date) values(owner_id,p_start_date) on conflict(user_id,start_date) do nothing;
 select id into strict result_id from public.weeks where user_id=owner_id and start_date=p_start_date;return result_id;
end; $$;

create function public.save_weekly_goal(p_start_date date,p_area_id uuid,p_goal jsonb,p_goal_id uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=auth.uid(); w uuid; plan uuid; result_id uuid;
begin
 if owner_id is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_goal_id is null then
  w:=public.ensure_planning_week(p_start_date);
  insert into public.area_weekly_plans(user_id,week_id,area_id) values(owner_id,w,p_area_id) on conflict(user_id,week_id,area_id) do nothing;
  select id into strict plan from public.area_weekly_plans where user_id=owner_id and week_id=w and area_id=p_area_id;
  insert into public.weekly_goals(user_id,week_id,area_id,plan_id,objective_id,title,type,unit,target,basis,frequency_mode,expected_observations,observation_unit,state)
  values(owner_id,w,p_area_id,plan,nullif(p_goal->>'objective_id','')::uuid,btrim(p_goal->>'title'),p_goal->>'type',btrim(p_goal->>'unit'),(p_goal->>'target')::numeric,p_goal->>'basis',p_goal->>'frequency_mode',(p_goal->>'expected_observations')::smallint,btrim(p_goal->>'observation_unit'),p_goal->>'state') returning id into result_id;
 else
  update public.weekly_goals set objective_id=nullif(p_goal->>'objective_id','')::uuid,title=btrim(p_goal->>'title'),type=p_goal->>'type',unit=btrim(p_goal->>'unit'),target=(p_goal->>'target')::numeric,basis=p_goal->>'basis',frequency_mode=p_goal->>'frequency_mode',expected_observations=(p_goal->>'expected_observations')::smallint,observation_unit=btrim(p_goal->>'observation_unit'),state=p_goal->>'state'
  where user_id=owner_id and id=p_goal_id and area_id=p_area_id and week_id in (select id from public.weeks where user_id=owner_id and start_date=p_start_date) and updated_at=(p_goal->>'expected_updated_at')::timestamptz returning id into result_id;
  if result_id is null then raise exception 'Goal changed; reload before editing' using errcode='40001';end if;
 end if;return result_id;
end; $$;

create function public.save_goal_record(p_goal_id uuid,p_record jsonb,p_record_id uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=auth.uid(); g public.weekly_goals; existing public.goal_records; result_id uuid; v numeric; c boolean;
begin
 if owner_id is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into strict g from public.weekly_goals where user_id=owner_id and id=p_goal_id for update;
 v:=(p_record->>'value')::numeric;c:=(p_record->>'completed')::boolean;
 if p_record_id is null then
  select * into existing from public.goal_records where user_id=owner_id and operation_id=(p_record->>'operation_id')::uuid;
  if found then
   if (existing.goal_id,existing.recorded_on,existing.value,existing.completed) is distinct from (p_goal_id,(p_record->>'recorded_on')::date,v,c) then raise exception 'Operation key reused for a different record' using errcode='22023';end if;
   return existing.id;
  end if;
  insert into public.goal_records(user_id,goal_id,goal_type,recorded_on,value,completed,operation_id)
  values(owner_id,p_goal_id,g.type,(p_record->>'recorded_on')::date,v,c,(p_record->>'operation_id')::uuid) returning id into result_id;
 else
  update public.goal_records set recorded_on=(p_record->>'recorded_on')::date,value=v,completed=c
  where user_id=owner_id and id=p_record_id and goal_id=p_goal_id and not is_deleted and updated_at=(p_record->>'expected_updated_at')::timestamptz returning id into result_id;
  if result_id is null then raise exception 'Record changed; reload before editing' using errcode='40001';end if;
 end if;return result_id;
end; $$;

create function public.list_objectives() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(o)||jsonb_build_object('target',o.target::text,'current_value',o.current_value::text) order by o.created_at,o.id),'[]'::jsonb) from public.objectives o where user_id=auth.uid();
$$;

create function public.get_planning_data(p_start_date date) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'week',(select to_jsonb(w) from public.weeks w where user_id=auth.uid() and start_date=p_start_date),
 'plans',coalesce((select jsonb_agg(to_jsonb(p)) from public.area_weekly_plans p join public.weeks w on w.id=p.week_id and w.user_id=p.user_id where p.user_id=auth.uid() and w.start_date=p_start_date),'[]'::jsonb),
 'goals',coalesce((select jsonb_agg(to_jsonb(g)||jsonb_build_object('target',g.target::text) order by g.created_at,g.id) from public.weekly_goals g join public.weeks w on w.id=g.week_id and w.user_id=g.user_id where g.user_id=auth.uid() and w.start_date=p_start_date),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(to_jsonb(s)) from public.goal_sources s join public.weekly_goals g on g.id=s.goal_id and g.user_id=s.user_id join public.weeks w on w.id=g.week_id and w.user_id=g.user_id where s.user_id=auth.uid() and w.start_date=p_start_date),'[]'::jsonb),
 'records',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('value',r.value::text) order by r.recorded_on,r.created_at,r.id) from public.goal_records r join public.weekly_goals g on g.id=r.goal_id and g.user_id=r.user_id join public.weeks w on w.id=g.week_id and w.user_id=g.user_id where r.user_id=auth.uid() and w.start_date=p_start_date),'[]'::jsonb)
 );
$$;

revoke all on function public.set_week_context (),
public.validate_weekly_goal (),
public.create_manual_goal_source (),
public.sync_area_plan (),
public.validate_area_plan (),
public.validate_objective (),
public.validate_goal_record ()
from public, anon, authenticated;

revoke all on function public.ensure_planning_week (date),
public.save_weekly_goal (date, uuid, jsonb, uuid),
public.save_goal_record (uuid, jsonb, uuid),
public.list_objectives (),
public.get_planning_data (date)
from public, anon;

grant
execute on function public.ensure_planning_week (date),
public.save_weekly_goal (date, uuid, jsonb, uuid),
public.save_goal_record (uuid, jsonb, uuid),
public.list_objectives (),
public.get_planning_data (date) to authenticated;

commit;