begin;

create table public.profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null default '' check (
        char_length(display_name) <= 80
    ),
    timezone text not null default 'America/Sao_Paulo',
    onboarding_completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.areas (
    id uuid primary key default gen_random_uuid (),
    user_id uuid not null default auth.uid () references public.profiles (user_id) on delete cascade,
    name text not null check (
        char_length(btrim (name)) between 1 and 80
        and name = btrim (name)
    ),
    icon text not null check (
        icon in (
            'book-open',
            'wallet',
            'briefcase',
            'brain',
            'heart',
            'target',
            'sparkles',
            'coffee',
            'music',
            'home',
            'globe',
            'leaf'
        )
    ),
    color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
    sort_order integer not null check (sort_order >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint areas_owner_order unique (user_id, sort_order) deferrable initially deferred,
    constraint areas_owner_id unique (user_id, id)
);

create function public.validate_profile_timezone() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_validate before insert or update on public.profiles
for each row execute function public.validate_profile_timezone();

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger areas_touch before update on public.areas
for each row execute function public.touch_updated_at();

-- Auth is the only source of profile ownership. No areas or fictional data are seeded.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(user_id, display_name)
  values (new.id, left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Cover accounts that existed before this migration.
insert into
    public.profiles (user_id, display_name)
select id, left(
        btrim (
            coalesce(
                raw_user_meta_data ->> 'full_name', ''
            )
        ), 80
    )
from auth.users on conflict (user_id) do nothing;

alter table public.profiles enable row level security;

alter table public.areas enable row level security;

alter table public.profiles force row level security;

alter table public.areas force row level security;

revoke all on public.profiles, public.areas from anon, authenticated;

grant select on public.profiles to authenticated;

grant
update (
    display_name,
    timezone,
    onboarding_completed_at
) on public.profiles to authenticated;

grant select, delete on public.areas to authenticated;

grant
insert (
        user_id,
        name,
        icon,
        color,
        sort_order
    ) on public.areas to authenticated;

grant
update (name, icon, color, sort_order) on public.areas to authenticated;

create policy profiles_select_own on public.profiles for
select to authenticated using (
        (
            select auth.uid ()
        ) = user_id
    );

create policy profiles_update_own on public.profiles for
update to authenticated using (
    (
        select auth.uid ()
    ) = user_id
)
with
    check (
        (
            select auth.uid ()
        ) = user_id
    );

create policy areas_select_own on public.areas for
select to authenticated using (
        (
            select auth.uid ()
        ) = user_id
    );

create policy areas_insert_own on public.areas for
insert
    to authenticated
with
    check (
        (
            select auth.uid ()
        ) = user_id
    );

create policy areas_update_own on public.areas for
update to authenticated using (
    (
        select auth.uid ()
    ) = user_id
)
with
    check (
        (
            select auth.uid ()
        ) = user_id
    );

create policy areas_delete_own on public.areas for delete to authenticated using (
    (
        select auth.uid ()
    ) = user_id
);

create function public.create_area(p_name text, p_icon text, p_color text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); result_id uuid;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform 1 from public.profiles where user_id = owner_id for update;
  insert into public.areas(user_id, name, icon, color, sort_order)
  select owner_id, p_name, p_icon, p_color, coalesce(max(sort_order) + 1, 0)
  from public.areas where user_id = owner_id returning id into result_id;
  return result_id;
end;
$$;

create function public.reorder_areas(p_ids uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); owned_count integer;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform 1 from public.profiles where user_id = owner_id for update;
  select count(*) into owned_count from public.areas where user_id = owner_id;
  if p_ids is null or cardinality(p_ids) <> owned_count
    or (select count(distinct item) from unnest(p_ids) as item) <> owned_count
    or (select count(*) from public.areas where user_id = owner_id and id = any(p_ids)) <> owned_count then
    raise exception 'Area list changed; reload before reordering' using errcode = '22023';
  end if;
  update public.areas a set sort_order = o.position::integer - 1
  from unnest(p_ids) with ordinality as o(id, position)
  where a.id = o.id and a.user_id = owner_id;
end;
$$;

create function public.complete_onboarding(p_display_name text, p_timezone text, p_areas jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); completed timestamptz;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select onboarding_completed_at into completed from public.profiles where user_id = owner_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if completed is not null then return; end if;
  if jsonb_typeof(p_areas) is distinct from 'array' then raise exception 'Invalid areas' using errcode = '22023'; end if;
  if exists (select 1 from public.areas where user_id = owner_id) then
    raise exception 'Areas already configured' using errcode = '22023';
  end if;
  insert into public.areas(user_id, name, icon, color, sort_order)
  select owner_id, value ->> 'name', value ->> 'icon', value ->> 'color', ordinality::integer - 1
  from jsonb_array_elements(p_areas) with ordinality;
  update public.profiles set display_name = btrim(p_display_name), timezone = p_timezone,
    onboarding_completed_at = now() where user_id = owner_id;
end;
$$;

revoke all on function public.validate_profile_timezone (),
public.touch_updated_at (),
public.handle_new_user ()
from public, anon, authenticated;

revoke all on function public.create_area(text,text,text), public.reorder_areas(uuid[]), public.complete_onboarding(text,text,jsonb) from public, anon;

grant execute on function public.create_area(text,text,text), public.reorder_areas(uuid[]), public.complete_onboarding(text,text,jsonb) to authenticated;

commit;