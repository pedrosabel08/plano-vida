begin;
create table public.career_projects (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 title text not null check(char_length(title) between 1 and 160),
 kind text not null check(kind in ('WORK','DEVELOPMENT')),
 due_on date check(due_on between date '1900-01-01' and date '9999-12-31'),
 objective_id uuid ,
 status text not null check(status in ('ACTIVE','COMPLETED','ARCHIVED')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,foreign key(user_id,objective_id) references public.objectives(user_id,id) on delete restrict
);
create index career_projects_owner_area on public.career_projects(user_id,area_id);
alter table public.career_projects enable row level security;
alter table public.career_projects force row level security;
create policy owner on public.career_projects for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.career_projects from anon,authenticated;
grant select,insert(id,user_id,area_id,title,kind,due_on,objective_id,status),update(title,kind,due_on,objective_id,status) on public.career_projects to authenticated;
create trigger touch before insert or update on public.career_projects for each row execute function public.touch_specialized_row();
create function public.save_career_project(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.career_projects;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.career_projects where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.title,r.kind,r.due_on,r.objective_id,r.status) is distinct from ((p_item->>'area_id')::uuid,btrim(p_item->>'title'),p_item->>'kind',(p_item->>'due_on')::date,(p_item->>'objective_id')::uuid,p_item->>'status') then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.career_projects(id,area_id,title,kind,due_on,objective_id,status) values(p_id,(p_item->>'area_id')::uuid,btrim(p_item->>'title'),p_item->>'kind',(p_item->>'due_on')::date,(p_item->>'objective_id')::uuid,p_item->>'status');
 else
  update public.career_projects set title=btrim(p_item->>'title'),kind=p_item->>'kind',due_on=(p_item->>'due_on')::date,objective_id=(p_item->>'objective_id')::uuid,status=p_item->>'status' where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_career_project(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_career_project(jsonb,uuid,timestamptz) to authenticated;

create table public.career_milestones (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 project_id uuid not null,
 title text not null check(char_length(title) between 1 and 160),
 kind text not null check(kind in ('TASK','MILESTONE','LESSON','DELIVERY')),
 due_on date check(due_on between date '1900-01-01' and date '9999-12-31'),
 completed_on date check(completed_on between date '1900-01-01' and date '9999-12-31'),
 is_deleted boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,foreign key(user_id,area_id,project_id) references public.career_projects(user_id,area_id,id) on delete restrict
);
create index career_milestones_owner_area on public.career_milestones(user_id,area_id);
alter table public.career_milestones enable row level security;
alter table public.career_milestones force row level security;
create policy owner on public.career_milestones for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.career_milestones from anon,authenticated;
grant select,insert(id,user_id,area_id,project_id,title,kind,due_on,completed_on,is_deleted),update(project_id,title,kind,due_on,completed_on,is_deleted) on public.career_milestones to authenticated;
create trigger touch before insert or update on public.career_milestones for each row execute function public.touch_specialized_row();
create function public.save_career_milestone(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.career_milestones;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.career_milestones where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.project_id,r.title,r.kind,r.due_on,r.completed_on,r.is_deleted) is distinct from ((p_item->>'area_id')::uuid,(p_item->>'project_id')::uuid,btrim(p_item->>'title'),p_item->>'kind',(p_item->>'due_on')::date,(p_item->>'completed_on')::date,(p_item->>'is_deleted')::boolean) then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.career_milestones(id,area_id,project_id,title,kind,due_on,completed_on,is_deleted) values(p_id,(p_item->>'area_id')::uuid,(p_item->>'project_id')::uuid,btrim(p_item->>'title'),p_item->>'kind',(p_item->>'due_on')::date,(p_item->>'completed_on')::date,(p_item->>'is_deleted')::boolean);
 else
  update public.career_milestones set project_id=(p_item->>'project_id')::uuid,title=btrim(p_item->>'title'),kind=p_item->>'kind',due_on=(p_item->>'due_on')::date,completed_on=(p_item->>'completed_on')::date,is_deleted=(p_item->>'is_deleted')::boolean where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_career_milestone(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_career_milestone(jsonb,uuid,timestamptz) to authenticated;

create table public.career_commitments (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 project_id uuid ,
 title text not null check(char_length(title) between 1 and 160),
 kind text not null check(kind in ('MEETING','DELIVERY')),
 due_on date not null check(due_on between date '1900-01-01' and date '9999-12-31'),
 completed_on date check(completed_on between date '1900-01-01' and date '9999-12-31'),
 is_deleted boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,foreign key(user_id,area_id,project_id) references public.career_projects(user_id,area_id,id) on delete restrict
);
create index career_commitments_owner_area on public.career_commitments(user_id,area_id);
alter table public.career_commitments enable row level security;
alter table public.career_commitments force row level security;
create policy owner on public.career_commitments for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.career_commitments from anon,authenticated;
grant select,insert(id,user_id,area_id,project_id,title,kind,due_on,completed_on,is_deleted),update(project_id,title,kind,due_on,completed_on,is_deleted) on public.career_commitments to authenticated;
create trigger touch before insert or update on public.career_commitments for each row execute function public.touch_specialized_row();
create function public.save_career_commitment(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.career_commitments;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.career_commitments where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.project_id,r.title,r.kind,r.due_on,r.completed_on,r.is_deleted) is distinct from ((p_item->>'area_id')::uuid,(p_item->>'project_id')::uuid,btrim(p_item->>'title'),p_item->>'kind',(p_item->>'due_on')::date,(p_item->>'completed_on')::date,(p_item->>'is_deleted')::boolean) then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.career_commitments(id,area_id,project_id,title,kind,due_on,completed_on,is_deleted) values(p_id,(p_item->>'area_id')::uuid,(p_item->>'project_id')::uuid,btrim(p_item->>'title'),p_item->>'kind',(p_item->>'due_on')::date,(p_item->>'completed_on')::date,(p_item->>'is_deleted')::boolean);
 else
  update public.career_commitments set project_id=(p_item->>'project_id')::uuid,title=btrim(p_item->>'title'),kind=p_item->>'kind',due_on=(p_item->>'due_on')::date,completed_on=(p_item->>'completed_on')::date,is_deleted=(p_item->>'is_deleted')::boolean where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_career_commitment(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_career_commitment(jsonb,uuid,timestamptz) to authenticated;

create table public.career_settings (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 study_area_id uuid ,
 study_target_minutes integer check(study_target_minutes between 1 and 10080),
 objective_id uuid ,
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,foreign key(user_id,study_area_id) references public.areas(user_id,id) on delete restrict,foreign key(user_id,objective_id) references public.objectives(user_id,id) on delete restrict,unique(user_id,area_id)
);
create index career_settings_owner_area on public.career_settings(user_id,area_id);
alter table public.career_settings enable row level security;
alter table public.career_settings force row level security;
create policy owner on public.career_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.career_settings from anon,authenticated;
grant select,insert(id,user_id,area_id,study_area_id,study_target_minutes,objective_id),update(study_area_id,study_target_minutes,objective_id) on public.career_settings to authenticated;
create trigger touch before insert or update on public.career_settings for each row execute function public.touch_specialized_row();
create function public.save_career_setting(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.career_settings;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.career_settings where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.study_area_id,r.study_target_minutes,r.objective_id) is distinct from ((p_item->>'area_id')::uuid,(p_item->>'study_area_id')::uuid,(p_item->>'study_target_minutes')::integer,(p_item->>'objective_id')::uuid) then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.career_settings(id,area_id,study_area_id,study_target_minutes,objective_id) values(p_id,(p_item->>'area_id')::uuid,(p_item->>'study_area_id')::uuid,(p_item->>'study_target_minutes')::integer,(p_item->>'objective_id')::uuid);
 else
  update public.career_settings set study_area_id=(p_item->>'study_area_id')::uuid,study_target_minutes=(p_item->>'study_target_minutes')::integer,objective_id=(p_item->>'objective_id')::uuid where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_career_setting(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_career_setting(jsonb,uuid,timestamptz) to authenticated;

create table public.career_reviews (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 reviewed_on date not null check(reviewed_on between date '1900-01-01' and date '9999-12-31'),
 wins text not null check(char_length(wins) between 1 and 4000),
 lessons text not null check(char_length(lessons)<=4000),
 next_steps text not null check(char_length(next_steps)<=4000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,check(char_length(btrim(wins))>0)
);
create index career_reviews_owner_area on public.career_reviews(user_id,area_id);
alter table public.career_reviews enable row level security;
alter table public.career_reviews force row level security;
create policy owner on public.career_reviews for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.career_reviews from anon,authenticated;
grant select,insert(id,user_id,area_id,reviewed_on,wins,lessons,next_steps),update(reviewed_on,wins,lessons,next_steps) on public.career_reviews to authenticated;
create trigger touch before insert or update on public.career_reviews for each row execute function public.touch_specialized_row();
create function public.save_career_review(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.career_reviews;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.career_reviews where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.reviewed_on,r.wins,r.lessons,r.next_steps) is distinct from ((p_item->>'area_id')::uuid,(p_item->>'reviewed_on')::date,p_item->>'wins',p_item->>'lessons',p_item->>'next_steps') then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.career_reviews(id,area_id,reviewed_on,wins,lessons,next_steps) values(p_id,(p_item->>'area_id')::uuid,(p_item->>'reviewed_on')::date,p_item->>'wins',p_item->>'lessons',p_item->>'next_steps');
 else
  update public.career_reviews set reviewed_on=(p_item->>'reviewed_on')::date,wins=p_item->>'wins',lessons=p_item->>'lessons',next_steps=p_item->>'next_steps' where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_career_review(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_career_review(jsonb,uuid,timestamptz) to authenticated;

create function public.validate_career_completion() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.completed_on>(select (now() at time zone timezone)::date from public.profiles where user_id=new.user_id) then raise exception 'Future completion' using errcode='23514';end if;return new;
end;$$;
create trigger career_validate before insert or update on public.career_milestones for each row execute function public.validate_career_completion();
create trigger career_validate before insert or update on public.career_commitments for each row execute function public.validate_career_completion();
revoke all on function public.validate_career_completion() from public,anon,authenticated;
create function public.get_career_data(p_area_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('projects',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.career_projects t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb),
'milestones',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.career_milestones t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb),
'commitments',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.career_commitments t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb),
'settings',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.career_settings t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb),
'reviews',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.career_reviews t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb),
 'study_sessions',coalesce((select jsonb_agg(s) from public.study_sessions s where s.user_id=auth.uid() and s.area_id=(select study_area_id from public.career_settings where user_id=auth.uid() and area_id=p_area_id)),'[]'::jsonb));
$$;
revoke all on function public.get_career_data(uuid) from public,anon;
grant execute on function public.get_career_data(uuid) to authenticated;
commit;
