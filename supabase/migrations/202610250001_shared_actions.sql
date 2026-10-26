begin;

-- Shared by all areas. Completing an action never writes reading_logs/goal_records.
create table public.actions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references public.profiles(user_id) on delete restrict,
 area_id uuid not null,
 objective_id uuid,
 book_id uuid,
 title text not null check (title=btrim(title) and char_length(title) between 1 and 160),
 due_on date check (due_on between date '1900-01-01' and date '9999-12-31'),
 due_time time,
 completed boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,
 foreign key(user_id,objective_id) references public.objectives(user_id,id) on delete restrict,
 foreign key(user_id,book_id) references public.books(user_id,id) on delete restrict,
 check (due_time is null or due_on is not null)
);
create index actions_owner_area_schedule on public.actions(user_id,area_id,completed,due_on,due_time);
alter table public.actions enable row level security;
alter table public.actions force row level security;
revoke all on public.actions from anon;
create policy actions_owner on public.actions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select on public.actions to authenticated;
grant insert(id,user_id,area_id,objective_id,book_id,title,due_on,due_time,completed),
 update(objective_id,book_id,title,due_on,due_time,completed) on public.actions to authenticated;

create function public.validate_action() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.book_id is not null and not exists (
  select 1 from public.books b join public.area_modules m on m.id=b.area_module_id and m.user_id=b.user_id
  where b.id=new.book_id and b.user_id=new.user_id and m.area_id=new.area_id
 ) then raise exception 'Book must belong to the action area' using errcode='23514'; end if;
 if new.objective_id is not null and not exists (
  select 1 from public.objectives o where o.id=new.objective_id and o.user_id=new.user_id and (o.area_id is null or o.area_id=new.area_id)
 ) then raise exception 'Objective must belong to the action area' using errcode='23514'; end if;
 if tg_op='UPDATE' then new.updated_at:=clock_timestamp(); end if;
 return new;
end; $$;
create trigger actions_validate before insert or update on public.actions for each row execute function public.validate_action();

create function public.get_area_actions(p_area_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(a) order by a.completed,a.due_on nulls last,a.due_time nulls last,a.created_at,a.id),'[]'::jsonb)
 from public.actions a where a.user_id=auth.uid() and a.area_id=p_area_id;
$$;

create function public.save_area_action(p_action jsonb,p_action_id uuid,p_expected_updated_at timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare existing public.actions; result_id uuid;
begin
 if p_expected_updated_at is null then
  select * into existing from public.actions where user_id=auth.uid() and id=p_action_id;
  if found then
   if (existing.area_id,existing.title,existing.book_id,existing.objective_id,existing.due_on,existing.due_time,existing.completed) is distinct from
      ((p_action->>'area_id')::uuid,btrim(p_action->>'title'),nullif(p_action->>'book_id','')::uuid,nullif(p_action->>'objective_id','')::uuid,nullif(p_action->>'due_on','')::date,nullif(p_action->>'due_time','')::time,coalesce((p_action->>'completed')::boolean,false))
   then raise exception 'Action key reused' using errcode='22023'; end if;
   return existing.id;
  end if;
  insert into public.actions(id,user_id,area_id,title,book_id,objective_id,due_on,due_time,completed)
  values(p_action_id,auth.uid(),(p_action->>'area_id')::uuid,btrim(p_action->>'title'),nullif(p_action->>'book_id','')::uuid,nullif(p_action->>'objective_id','')::uuid,nullif(p_action->>'due_on','')::date,nullif(p_action->>'due_time','')::time,coalesce((p_action->>'completed')::boolean,false)) returning id into result_id;
 else
  update public.actions set title=btrim(p_action->>'title'),book_id=nullif(p_action->>'book_id','')::uuid,objective_id=nullif(p_action->>'objective_id','')::uuid,
   due_on=nullif(p_action->>'due_on','')::date,due_time=nullif(p_action->>'due_time','')::time,completed=(p_action->>'completed')::boolean
  where user_id=auth.uid() and id=p_action_id and area_id=(p_action->>'area_id')::uuid and updated_at=p_expected_updated_at returning id into result_id;
  if result_id is null then raise exception 'Concurrent action update' using errcode='40001'; end if;
 end if;
 return result_id;
end; $$;

create function public.complete_area_action(p_action_id uuid,p_completed boolean,p_expected_updated_at timestamptz) returns uuid language plpgsql security invoker set search_path='' as $$
declare result_id uuid;
begin
 update public.actions set completed=p_completed where user_id=auth.uid() and id=p_action_id and updated_at=p_expected_updated_at returning id into result_id;
 if result_id is null then raise exception 'Concurrent action update' using errcode='40001'; end if;
 return result_id;
end; $$;
revoke all on function public.validate_action() from public,anon,authenticated;
revoke all on function public.get_area_actions(uuid),public.save_area_action(jsonb,uuid,timestamptz),public.complete_area_action(uuid,boolean,timestamptz) from public,anon;
grant execute on function public.get_area_actions(uuid),public.save_area_action(jsonb,uuid,timestamptz),public.complete_area_action(uuid,boolean,timestamptz) to authenticated;
commit;
