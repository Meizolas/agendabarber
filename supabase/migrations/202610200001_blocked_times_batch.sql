-- Bloqueio idempotente de vários horários específicos na mesma data.

begin;

create or replace function public.block_barber_times(
  p_barber_id uuid,
  p_blocked_date date,
  p_blocked_times time[],
  p_reason text default null
) returns setof public.blocked_times
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_barber_id is null or p_blocked_date is null then raise exception 'INVALID_BLOCK'; end if;
  if coalesce(cardinality(p_blocked_times), 0) < 1 or cardinality(p_blocked_times) > 48 then raise exception 'INVALID_BLOCK_TIMES'; end if;
  if p_blocked_date < timezone('America/Sao_Paulo', now())::date then raise exception 'PAST_BLOCK_DATE'; end if;
  if p_blocked_date = timezone('America/Sao_Paulo', now())::date
     and exists (select 1 from unnest(p_blocked_times) value where value <= timezone('America/Sao_Paulo', now())::time)
  then raise exception 'PAST_BLOCK_TIME'; end if;

  perform pg_advisory_xact_lock(hashtext(p_barber_id::text || ':blocked:' || p_blocked_date::text));

  insert into public.blocked_times (barber_id, blocked_date, blocked_time, reason)
  select p_barber_id, p_blocked_date, requested.value, nullif(trim(p_reason), '')
  from (select distinct unnest(p_blocked_times) as value) requested
  where not exists (
    select 1 from public.blocked_times existing
    where existing.barber_id = p_barber_id
      and existing.blocked_date = p_blocked_date
      and existing.blocked_time = requested.value
  );

  if nullif(trim(p_reason), '') is not null then
    update public.blocked_times existing
    set reason = trim(p_reason)
    where existing.barber_id = p_barber_id
      and existing.blocked_date = p_blocked_date
      and existing.blocked_time = any(p_blocked_times);
  end if;

  return query
  select blocked.* from public.blocked_times blocked
  where blocked.barber_id = p_barber_id
    and blocked.blocked_date = p_blocked_date
    and blocked.blocked_time = any(p_blocked_times)
  order by blocked.blocked_time;
end;
$$;

revoke all on function public.block_barber_times(uuid, date, time[], text) from public, anon, authenticated;
grant execute on function public.block_barber_times(uuid, date, time[], text) to service_role;

commit;
