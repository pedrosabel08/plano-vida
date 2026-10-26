begin;
create table public.finance_categories (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 title text not null check(char_length(btrim(title)) between 1 and 160),
 kind text not null check(kind in ('INCOME','EXPENSE')),
 archived boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,unique(user_id,area_id,id,kind)
);
create index finance_categories_owner_area on public.finance_categories(user_id,area_id);
alter table public.finance_categories enable row level security;
alter table public.finance_categories force row level security;
create policy owner on public.finance_categories for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.finance_categories from anon,authenticated;
grant select,insert(id,user_id,area_id,title,kind,archived),update(title,kind,archived) on public.finance_categories to authenticated;
create trigger touch before insert or update on public.finance_categories for each row execute function public.touch_specialized_row();
create function public.save_finance_category(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.finance_categories;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.finance_categories where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.title,r.kind,r.archived) is distinct from ((p_item->>'area_id')::uuid,btrim(p_item->>'title'),p_item->>'kind',(p_item->>'archived')::boolean) then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.finance_categories(id,area_id,title,kind,archived) values(p_id,(p_item->>'area_id')::uuid,btrim(p_item->>'title'),p_item->>'kind',(p_item->>'archived')::boolean);
 else
  update public.finance_categories set title=btrim(p_item->>'title'),kind=p_item->>'kind',archived=(p_item->>'archived')::boolean where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_finance_category(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_finance_category(jsonb,uuid,timestamptz) to authenticated;

create table public.finance_transactions (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 category_id uuid not null,
 kind text not null check(kind in ('INCOME','EXPENSE')),
 description text not null check(char_length(description) between 1 and 160),
 amount_cents bigint not null check(amount_cents between 1 and 999999999999),
 booked_on date not null check(booked_on between date '1900-01-01' and date '9999-12-31'),
 status text not null check(status in ('PLANNED','REALIZED')),
 is_deleted boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,foreign key(user_id,area_id,category_id,kind) references public.finance_categories(user_id,area_id,id,kind) on delete restrict
);
create index finance_transactions_owner_area on public.finance_transactions(user_id,area_id);
alter table public.finance_transactions enable row level security;
alter table public.finance_transactions force row level security;
create policy owner on public.finance_transactions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.finance_transactions from anon,authenticated;
grant select,insert(id,user_id,area_id,category_id,kind,description,amount_cents,booked_on,status,is_deleted),update(category_id,kind,description,amount_cents,booked_on,status,is_deleted) on public.finance_transactions to authenticated;
create trigger touch before insert or update on public.finance_transactions for each row execute function public.touch_specialized_row();
create function public.save_finance_transaction(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.finance_transactions;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.finance_transactions where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.category_id,r.kind,r.description,r.amount_cents,r.booked_on,r.status,r.is_deleted) is distinct from ((p_item->>'area_id')::uuid,(p_item->>'category_id')::uuid,p_item->>'kind',btrim(p_item->>'description'),(p_item->>'amount_cents')::bigint,(p_item->>'booked_on')::date,p_item->>'status',(p_item->>'is_deleted')::boolean) then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.finance_transactions(id,area_id,category_id,kind,description,amount_cents,booked_on,status,is_deleted) values(p_id,(p_item->>'area_id')::uuid,(p_item->>'category_id')::uuid,p_item->>'kind',btrim(p_item->>'description'),(p_item->>'amount_cents')::bigint,(p_item->>'booked_on')::date,p_item->>'status',(p_item->>'is_deleted')::boolean);
 else
  update public.finance_transactions set category_id=(p_item->>'category_id')::uuid,kind=p_item->>'kind',description=btrim(p_item->>'description'),amount_cents=(p_item->>'amount_cents')::bigint,booked_on=(p_item->>'booked_on')::date,status=p_item->>'status',is_deleted=(p_item->>'is_deleted')::boolean where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_finance_transaction(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_finance_transaction(jsonb,uuid,timestamptz) to authenticated;

create table public.finance_budgets (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 category_id uuid not null,
 month date not null check(extract(day from month)=1),
 limit_cents bigint not null check(limit_cents between 1 and 999999999999),
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,foreign key(user_id,area_id,category_id) references public.finance_categories(user_id,area_id,id) on delete restrict, unique(user_id,area_id,category_id,month)
);
create index finance_budgets_owner_area on public.finance_budgets(user_id,area_id);
alter table public.finance_budgets enable row level security;
alter table public.finance_budgets force row level security;
create policy owner on public.finance_budgets for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.finance_budgets from anon,authenticated;
grant select,insert(id,user_id,area_id,category_id,month,limit_cents),update(category_id,month,limit_cents) on public.finance_budgets to authenticated;
create trigger touch before insert or update on public.finance_budgets for each row execute function public.touch_specialized_row();
create function public.save_finance_budget(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.finance_budgets;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.finance_budgets where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.category_id,r.month,r.limit_cents) is distinct from ((p_item->>'area_id')::uuid,(p_item->>'category_id')::uuid,(p_item->>'month')::date,(p_item->>'limit_cents')::bigint) then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.finance_budgets(id,area_id,category_id,month,limit_cents) values(p_id,(p_item->>'area_id')::uuid,(p_item->>'category_id')::uuid,(p_item->>'month')::date,(p_item->>'limit_cents')::bigint);
 else
  update public.finance_budgets set category_id=(p_item->>'category_id')::uuid,month=(p_item->>'month')::date,limit_cents=(p_item->>'limit_cents')::bigint where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_finance_budget(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_finance_budget(jsonb,uuid,timestamptz) to authenticated;

create table public.finance_goals (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 title text not null check(char_length(title) between 1 and 160),
 target_cents bigint not null check(target_cents between 1 and 999999999999),
 due_on date check(due_on between date '1900-01-01' and date '9999-12-31'),
 objective_id uuid ,
 archived boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,foreign key(user_id,objective_id) references public.objectives(user_id,id) on delete restrict
);
create index finance_goals_owner_area on public.finance_goals(user_id,area_id);
alter table public.finance_goals enable row level security;
alter table public.finance_goals force row level security;
create policy owner on public.finance_goals for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.finance_goals from anon,authenticated;
grant select,insert(id,user_id,area_id,title,target_cents,due_on,objective_id,archived),update(title,target_cents,due_on,objective_id,archived) on public.finance_goals to authenticated;
create trigger touch before insert or update on public.finance_goals for each row execute function public.touch_specialized_row();
create function public.save_finance_goal(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.finance_goals;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.finance_goals where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.title,r.target_cents,r.due_on,r.objective_id,r.archived) is distinct from ((p_item->>'area_id')::uuid,btrim(p_item->>'title'),(p_item->>'target_cents')::bigint,(p_item->>'due_on')::date,(p_item->>'objective_id')::uuid,(p_item->>'archived')::boolean) then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.finance_goals(id,area_id,title,target_cents,due_on,objective_id,archived) values(p_id,(p_item->>'area_id')::uuid,btrim(p_item->>'title'),(p_item->>'target_cents')::bigint,(p_item->>'due_on')::date,(p_item->>'objective_id')::uuid,(p_item->>'archived')::boolean);
 else
  update public.finance_goals set title=btrim(p_item->>'title'),target_cents=(p_item->>'target_cents')::bigint,due_on=(p_item->>'due_on')::date,objective_id=(p_item->>'objective_id')::uuid,archived=(p_item->>'archived')::boolean where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_finance_goal(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_finance_goal(jsonb,uuid,timestamptz) to authenticated;

create table public.finance_contributions (
 id uuid primary key,user_id uuid not null default auth.uid(),area_id uuid not null,
 goal_id uuid not null,
 amount_cents bigint not null check(amount_cents between 1 and 999999999999),
 recorded_on date not null check(recorded_on between date '1900-01-01' and date '9999-12-31'),
 is_deleted boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,area_id,id),
 foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict,foreign key(user_id,area_id,goal_id) references public.finance_goals(user_id,area_id,id) on delete restrict
);
create index finance_contributions_owner_area on public.finance_contributions(user_id,area_id);
alter table public.finance_contributions enable row level security;
alter table public.finance_contributions force row level security;
create policy owner on public.finance_contributions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.finance_contributions from anon,authenticated;
grant select,insert(id,user_id,area_id,goal_id,amount_cents,recorded_on,is_deleted),update(goal_id,amount_cents,recorded_on,is_deleted) on public.finance_contributions to authenticated;
create trigger touch before insert or update on public.finance_contributions for each row execute function public.touch_specialized_row();
create function public.save_finance_contribution(p_item jsonb,p_id uuid,p_expected timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.finance_contributions;begin
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 if p_expected is null then
  select * into r from public.finance_contributions where user_id=auth.uid() and id=p_id;
  if found then
   if (r.area_id,r.goal_id,r.amount_cents,r.recorded_on,r.is_deleted) is distinct from ((p_item->>'area_id')::uuid,(p_item->>'goal_id')::uuid,(p_item->>'amount_cents')::bigint,(p_item->>'recorded_on')::date,(p_item->>'is_deleted')::boolean) then raise exception 'Key reused' using errcode='22023';end if;return p_id;
  end if;
  insert into public.finance_contributions(id,area_id,goal_id,amount_cents,recorded_on,is_deleted) values(p_id,(p_item->>'area_id')::uuid,(p_item->>'goal_id')::uuid,(p_item->>'amount_cents')::bigint,(p_item->>'recorded_on')::date,(p_item->>'is_deleted')::boolean);
 else
  update public.finance_contributions set goal_id=(p_item->>'goal_id')::uuid,amount_cents=(p_item->>'amount_cents')::bigint,recorded_on=(p_item->>'recorded_on')::date,is_deleted=(p_item->>'is_deleted')::boolean where user_id=auth.uid() and id=p_id and area_id=(p_item->>'area_id')::uuid and updated_at=p_expected returning * into r;
  if not found then raise exception 'Changed; reload' using errcode='40001';end if;
 end if;return p_id;end;$$;
revoke all on function public.save_finance_contribution(jsonb,uuid,timestamptz) from public,anon;
grant execute on function public.save_finance_contribution(jsonb,uuid,timestamptz) to authenticated;

create function public.validate_finance_entry() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_table_name='finance_transactions' then
  if new.status='REALIZED' and new.booked_on>(select (now() at time zone timezone)::date from public.profiles where user_id=new.user_id) then raise exception 'Future transactions must be planned' using errcode='23514';end if;
 elsif tg_table_name='finance_budgets' then
  if not exists(select 1 from public.finance_categories where user_id=new.user_id and id=new.category_id and kind='EXPENSE') then raise exception 'Budget requires expense category' using errcode='23514';end if;
 elsif tg_table_name='finance_contributions' then
  if new.recorded_on>(select (now() at time zone timezone)::date from public.profiles where user_id=new.user_id) then raise exception 'Future contribution' using errcode='23514';end if;
 end if;
 return new;
end;$$;
create trigger finance_validate before insert or update on public.finance_transactions for each row execute function public.validate_finance_entry();
create trigger finance_validate before insert or update on public.finance_budgets for each row execute function public.validate_finance_entry();
create trigger finance_validate before insert or update on public.finance_contributions for each row execute function public.validate_finance_entry();
revoke all on function public.validate_finance_entry() from public,anon,authenticated;
create function public.get_finance_data(p_area_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('categories',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.finance_categories t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb),
'transactions',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.finance_transactions t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb),
'budgets',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.finance_budgets t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb),
'goals',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.finance_goals t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb),
'contributions',coalesce((select jsonb_agg(t order by t.created_at,t.id) from public.finance_contributions t where user_id=auth.uid() and area_id=p_area_id),'[]'::jsonb));
$$;
revoke all on function public.get_finance_data(uuid) from public,anon;
grant execute on function public.get_finance_data(uuid) to authenticated;
commit;
