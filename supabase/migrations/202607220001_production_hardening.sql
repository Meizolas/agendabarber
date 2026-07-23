-- Execute esta migracao no SQL Editor do Supabase antes do primeiro deploy.
-- Ela pode ser executada novamente com seguranca.

create table if not exists public.api_rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  hits integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.api_rate_limits%rowtype;
begin
  if p_limit < 1 or p_window_seconds < 1 or length(p_key) > 200 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_key));

  select * into v_row from public.api_rate_limits where key = p_key for update;
  if not found or v_row.window_started_at <= now() - make_interval(secs => p_window_seconds) then
    insert into public.api_rate_limits(key, window_started_at, hits, updated_at)
    values (p_key, now(), 1, now())
    on conflict (key) do update
      set window_started_at = excluded.window_started_at, hits = 1, updated_at = now();
    return true;
  end if;

  if v_row.hits >= p_limit then return false; end if;

  update public.api_rate_limits set hits = hits + 1, updated_at = now() where key = p_key;
  return true;
end;
$$;

create or replace function public.create_public_appointment(
  p_barber_id uuid,
  p_service_id uuid,
  p_client_name text,
  p_client_whatsapp text,
  p_appointment_date date,
  p_appointment_time time,
  p_notes text default null
) returns setof public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
  v_rule public.availability_rules%rowtype;
  v_start timestamp;
  v_end timestamp;
begin
  -- Serializa todas as reservas do mesmo profissional/dia.
  perform pg_advisory_xact_lock(hashtext(p_barber_id::text || ':' || p_appointment_date::text));

  select * into v_service
  from public.services
  where id = p_service_id and barber_id = p_barber_id and is_active = true;
  if not found then raise exception 'INVALID_SERVICE'; end if;

  select * into v_rule
  from public.availability_rules
  where barber_id = p_barber_id
    and day_of_week = extract(dow from p_appointment_date)::integer
    and is_active = true;
  if not found then raise exception 'OUTSIDE_AVAILABILITY'; end if;

  v_start := p_appointment_date + p_appointment_time;
  v_end := v_start + make_interval(mins => v_service.duration_minutes);

  if v_start <= timezone('America/Sao_Paulo', now()) then
    raise exception 'PAST_APPOINTMENT';
  end if;

  if p_appointment_time < v_rule.start_time
     or v_end > p_appointment_date + v_rule.end_time
     or mod((extract(epoch from (p_appointment_time - v_rule.start_time)) / 60)::integer, v_rule.interval_minutes) <> 0 then
    raise exception 'OUTSIDE_AVAILABILITY';
  end if;

  if exists (
    select 1 from public.blocked_times b
    where b.barber_id = p_barber_id and b.blocked_date = p_appointment_date
      and (b.blocked_time is null or b.blocked_time = p_appointment_time)
  ) then raise exception 'BLOCKED_TIME'; end if;

  if exists (
    select 1
    from public.appointments a
    join public.services s on s.id = a.service_id
    where a.barber_id = p_barber_id
      and a.appointment_date = p_appointment_date
      and a.status = 'confirmed'
      and v_start < (a.appointment_date + a.appointment_time + make_interval(mins => s.duration_minutes))
      and v_end > (a.appointment_date + a.appointment_time)
  ) then raise exception 'SLOT_CONFLICT'; end if;

  return query
    insert into public.appointments (
      barber_id, service_id, client_name, client_whatsapp,
      appointment_date, appointment_time, notes, status
    ) values (
      p_barber_id, p_service_id, trim(p_client_name), p_client_whatsapp,
      p_appointment_date, p_appointment_time, nullif(trim(p_notes), ''), 'confirmed'
    ) returning *;
end;
$$;

-- O navegador nao precisa consultar as tabelas: as rotas server-side usam service_role.
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blocked_times enable row level security;
alter table public.appointments enable row level security;
alter table public.whatsapp_logs enable row level security;

revoke all on table public.barbers, public.services, public.availability_rules,
  public.blocked_times, public.appointments, public.whatsapp_logs, public.api_rate_limits
  from anon, authenticated;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.create_public_appointment(uuid, uuid, text, text, date, time, text) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.create_public_appointment(uuid, uuid, text, text, date, time, text) to service_role;

create index if not exists appointments_barber_date_status_idx
  on public.appointments(barber_id, appointment_date, status);
create index if not exists blocked_times_barber_date_idx
  on public.blocked_times(barber_id, blocked_date);

