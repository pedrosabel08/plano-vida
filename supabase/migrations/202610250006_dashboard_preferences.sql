begin;
create table public.area_dashboard_preferences (
 user_id uuid not null default auth.uid(),area_id uuid not null,
 dashboard text not null check(dashboard in ('leitura','estudos','financas','carreira','saude')),
 primary key(user_id,area_id),foreign key(user_id,area_id) references public.areas(user_id,id) on delete restrict
);
alter table public.area_dashboard_preferences enable row level security;
alter table public.area_dashboard_preferences force row level security;
create policy owner on public.area_dashboard_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.area_dashboard_preferences from anon,authenticated;
grant select,insert(user_id,area_id,dashboard),update(dashboard) on public.area_dashboard_preferences to authenticated;
create function public.set_area_dashboard(p_area_id uuid,p_dashboard text) returns void language sql security invoker set search_path='' as $$
 insert into public.area_dashboard_preferences(area_id,dashboard) values(p_area_id,p_dashboard) on conflict(user_id,area_id) do update set dashboard=excluded.dashboard;
$$;
create function public.get_area_dashboard(p_area_id uuid) returns text language sql stable security invoker set search_path='' as $$
 select dashboard from public.area_dashboard_preferences where user_id=auth.uid() and area_id=p_area_id;
$$;
revoke all on function public.set_area_dashboard(uuid,text),public.get_area_dashboard(uuid) from public,anon;
grant execute on function public.set_area_dashboard(uuid,text),public.get_area_dashboard(uuid) to authenticated;
commit;
