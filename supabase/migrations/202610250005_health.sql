begin;
create table public.health_settings (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 sleep_target_minutes integer check(sleep_target_minutes between 1 and 1440),
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,unique(user_id,area_id)
);
create index health_settings_owner_area on public.health_settings(user_id,area_id);
alter table public.health_settings enable row level security;
alter table public.health_settings force row level security;
create policy owner on public.health_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.health_settings from anon,authenticated;
grant select,insert(id,user_id,area_id,sleep_target_minutes),update(sleep_target_minutes) on public.health_settings to authenticated;
create trigger touch before insert or update on public.health_settings for each row execute function public.touch_specialized_row();
create function public.save_health_setting(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.health_settings;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.health_settings where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.sleep_target_minutes) is distinct from ((p_item->>'area_id')::uuid,(p_item->>'sleep_target_minutes')::integer) then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.health_settings(id,area_id,sleep_target_minutes) values(p_id,(p_item->>'area_id')::uuid,(p_item->>'sleep_target_minutes')::integer);
 else
  update public.health_settings set sleep_target_minutes=(p_item->>'sleep_target_minutes')::integer where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_health_setting(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_health_setting(jsonb,uuid,timestamptz) to authenticated;

create table public.sleep_logs (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 bed_at timestamptz not null,
 wake_at timestamptz not null,
 timezone text not null,
 energy integer check(energy between 1 and 5),
 is_deleted boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,check(wake_at>bed_at and wake_at<=bed_at+interval '24 hours')
);
create index sleep_logs_owner_area on public.sleep_logs(user_id,area_id);
alter table public.sleep_logs enable row level security;
alter table public.sleep_logs force row level security;
create policy owner on public.sleep_logs for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.sleep_logs from anon,authenticated;
grant select,insert(id,user_id,area_id,bed_at,wake_at,timezone,energy,is_deleted),update(bed_at,wake_at,timezone,energy,is_deleted) on public.sleep_logs to authenticated;
create trigger touch before insert or update on public.sleep_logs for each row execute function public.touch_specialized_row();
create function public.save_sleep_log(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.sleep_logs;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.sleep_logs where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.bed_at,r.wake_at,r.timezone,r.energy,r.is_deleted) is distinct from ((p_item->>'area_id')::uuid,(p_item->>'bed_at')::timestamptz,(p_item->>'wake_at')::timestamptz,p_item->>'timezone',(p_item->>'energy')::integer,(p_item->>'is_deleted')::boolean) then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.sleep_logs(id,area_id,bed_at,wake_at,timezone,energy,is_deleted) values(p_id,(p_item->>'area_id')::uuid,(p_item->>'bed_at')::timestamptz,(p_item->>'wake_at')::timestamptz,p_item->>'timezone',(p_item->>'energy')::integer,(p_item->>'is_deleted')::boolean);
 else
  update public.sleep_logs set bed_at=(p_item->>'bed_at')::timestamptz,wake_at=(p_item->>'wake_at')::timestamptz,timezone=p_item->>'timezone',energy=(p_item->>'energy')::integer,is_deleted=(p_item->>'is_deleted')::boolean where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_sleep_log(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_sleep_log(jsonb,uuid,timestamptz) to authenticated;

create table public.health_routines (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 title text not null check(char_length(title) between 1 and 160),
 kind text not null check(kind in ('SLEEP','ORAL')),
 starts_on date not null check(starts_on between date '1900-01-01' and date '9999-12-31'),
 ends_on date check(ends_on between date '1900-01-01' and date '9999-12-31'),
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,check(ends_on is null or ends_on>=starts_on)
);
create index health_routines_owner_area on public.health_routines(user_id,area_id);
alter table public.health_routines enable row level security;
alter table public.health_routines force row level security;
create policy owner on public.health_routines for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.health_routines from anon,authenticated;
grant select,insert(id,user_id,area_id,title,kind,starts_on,ends_on),update(title,kind,starts_on,ends_on) on public.health_routines to authenticated;
create trigger touch before insert or update on public.health_routines for each row execute function public.touch_specialized_row();
create function public.save_health_routine(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.health_routines;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.health_routines where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.title,r.kind,r.starts_on,r.ends_on) is distinct from ((p_item->>'area_id')::uuid,btrim(p_item->>'title'),p_item->>'kind',(p_item->>'starts_on')::date,(p_item->>'ends_on')::date) then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.health_routines(id,area_id,title,kind,starts_on,ends_on) values(p_id,(p_item->>'area_id')::uuid,btrim(p_item->>'title'),p_item->>'kind',(p_item->>'starts_on')::date,(p_item->>'ends_on')::date);
 else
  update public.health_routines set title=btrim(p_item->>'title'),kind=p_item->>'kind',starts_on=(p_item->>'starts_on')::date,ends_on=(p_item->>'ends_on')::date where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_health_routine(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_health_routine(jsonb,uuid,timestamptz) to authenticated;

create table public.routine_checks (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 routine_id uuid not null,
 completed_on date not null check(completed_on between date '1900-01-01' and date '9999-12-31'),
 completed boolean not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,foreign key(user_id,area_id,routine_id) references public.health_routines(user_id,area_id,id) on delete restrict,unique(user_id,routine_id,completed_on)
);
create index routine_checks_owner_area on public.routine_checks(user_id,area_id);
alter table public.routine_checks enable row level security;
alter table public.routine_checks force row level security;
create policy owner on public.routine_checks for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.routine_checks from anon,authenticated;
grant select,insert(id,user_id,area_id,routine_id,completed_on,completed),update(routine_id,completed_on,completed) on public.routine_checks to authenticated;
create trigger touch before insert or update on public.routine_checks for each row execute function public.touch_specialized_row();
create function public.save_routine_check(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.routine_checks;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.routine_checks where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.routine_id,r.completed_on,r.completed) is distinct from ((p_item->>'area_id')::uuid,(p_item->>'routine_id')::uuid,(p_item->>'completed_on')::date,(p_item->>'completed')::boolean) then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.routine_checks(id,area_id,routine_id,completed_on,completed) values(p_id,(p_item->>'area_id')::uuid,(p_item->>'routine_id')::uuid,(p_item->>'completed_on')::date,(p_item->>'completed')::boolean);
 else
  update public.routine_checks set routine_id=(p_item->>'routine_id')::uuid,completed_on=(p_item->>'completed_on')::date,completed=(p_item->>'completed')::boolean where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_routine_check(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_routine_check(jsonb,uuid,timestamptz) to authenticated;

alter table public.sleep_logs add column wake_on date not null default current_date;
create unique index sleep_logs_one_night on public.sleep_logs(user_id,area_id,wake_on) where not is_deleted;
create function public.validate_health_entry() returns trigger language plpgsql security invoker set search_path='' as $$
declare local_today date;routine public.health_routines;
begin
 select (now() at time zone timezone)::date into local_today from public.profiles where user_id=new.user_id;
 if tg_table_name='sleep_logs' then
  if tg_op='INSERT' then
   if new.timezone is distinct from (select timezone from public.profiles where user_id=new.user_id) then raise exception 'Use account timezone' using errcode='23514';end if;
  elsif new.timezone is distinct from old.timezone then raise exception 'Preserve night timezone' using errcode='23514';end if;
  new.wake_on:=(new.wake_at at time zone new.timezone)::date;
  if new.wake_at>now() or new.bed_at<timestamp with time zone '1900-01-01 00:00Z' or new.wake_on>date '9999-12-31' then raise exception 'Invalid night date' using errcode='23514';end if;
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text||new.area_id::text,1));
  if not new.is_deleted and exists(select 1 from public.sleep_logs l where l.user_id=new.user_id and l.area_id=new.area_id and l.id<>new.id and not l.is_deleted and l.bed_at<new.wake_at and l.wake_at>new.bed_at) then raise exception 'Overlapping night' using errcode='23514';end if;
 elsif tg_table_name='health_routines' then
  if tg_op='UPDATE' then
   if (new.starts_on,new.kind) is distinct from (old.starts_on,old.kind) then raise exception 'Preserve routine history; create another routine' using errcode='23514';end if;
   if new.ends_on is distinct from old.ends_on and (new.ends_on<local_today or (old.ends_on is not null and old.ends_on<local_today)) then raise exception 'Cannot rewrite past schedule' using errcode='23514';end if;
  end if;
 elsif tg_table_name='routine_checks' then
  select * into strict routine from public.health_routines where user_id=new.user_id and area_id=new.area_id and id=new.routine_id for share;
  if new.completed_on>local_today or new.completed_on<routine.starts_on or (routine.ends_on is not null and new.completed_on>routine.ends_on) then raise exception 'Check outside routine schedule' using errcode='23514';end if;
 end if;return new;
end;$$;
create trigger health_validate before insert or update on public.sleep_logs for each row execute function public.validate_health_entry();
create trigger health_validate before insert or update on public.health_routines for each row execute function public.validate_health_entry();
create trigger health_validate before insert or update on public.routine_checks for each row execute function public.validate_health_entry();
revoke all on function public.validate_health_entry() from public,anon,authenticated;
create function public.get_health_data(p_area_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('settings',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.health_settings t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb),
'nights',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.sleep_logs t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb),
'routines',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.health_routines t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb),
'checks',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.routine_checks t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb));
$$;
revoke all on function public.get_health_data(uuid) from public,anon;
grant execute on function public.get_health_data(uuid) to authenticated;
commit;
