begin;
-- Enforce date rules even for authenticated direct table writes, not only RPCs.
create function public.validate_specialized_record_date() returns trigger language plpgsql security invoker set search_path='' as $$
declare local_today date;record_date date;
begin
 select (now() at time zone timezone)::date into local_today from public.profiles where user_id=new.user_id;
 record_date:=case when tg_table_name='study_sessions' then (to_jsonb(new)->>'studied_on')::date else (to_jsonb(new)->>'reviewed_on')::date end;
 if record_date>local_today then raise exception 'Execution records cannot be in the future' using errcode='23514';end if;
 return new;
end;$$;
create trigger study_record_date before insert or update on public.study_sessions for each row execute function public.validate_specialized_record_date();
create trigger career_review_date before insert or update on public.career_reviews for each row execute function public.validate_specialized_record_date();
revoke all on function public.validate_specialized_record_date() from public,anon,authenticated;
commit;
