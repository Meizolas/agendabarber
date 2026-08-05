-- Pagamento do servico por Pix estatico ou presencial, com confirmacao manual pelo barbeiro.

begin;

alter table public.barbers
  add column if not exists pix_key text,
  add column if not exists pix_key_type text not null default 'phone';

alter table public.appointments
  add column if not exists payment_method text not null default 'at_barbershop',
  add column if not exists payment_status text not null default 'pending_confirmation',
  add column if not exists payment_confirmed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_payment_method_check') then
    alter table public.appointments add constraint appointments_payment_method_check
      check (payment_method in ('pix', 'at_barbershop'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'appointments_payment_status_check') then
    alter table public.appointments add constraint appointments_payment_status_check
      check (payment_status in ('pending_confirmation', 'paid'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'barbers_pix_key_type_check') then
    alter table public.barbers add constraint barbers_pix_key_type_check
      check (pix_key_type in ('cpf', 'cnpj', 'email', 'phone', 'random'));
  end if;
end;
$$;

create index if not exists appointments_barber_payment_status_idx
  on public.appointments (barber_id, payment_status, appointment_date);

drop function if exists public.create_public_appointment(uuid, uuid, uuid, text, text, date, time, text);

create or replace function public.create_public_appointment(
  p_barber_id uuid,
  p_staff_member_id uuid,
  p_service_id uuid,
  p_client_name text,
  p_client_whatsapp text,
  p_appointment_date date,
  p_appointment_time time,
  p_notes text default null,
  p_payment_method text default 'at_barbershop'
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
  v_payment_method text;
begin
  v_payment_method := coalesce(nullif(trim(p_payment_method), ''), 'at_barbershop');
  if v_payment_method not in ('pix', 'at_barbershop') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if not exists (
    select 1 from public.staff_members member
    where member.id = p_staff_member_id and member.barber_id = p_barber_id and member.is_active
  ) then raise exception 'INVALID_STAFF_MEMBER'; end if;

  perform pg_advisory_xact_lock(hashtext(p_staff_member_id::text || ':' || p_appointment_date::text));

  select * into v_service from public.services
  where id = p_service_id and barber_id = p_barber_id and is_active = true;
  if not found then raise exception 'INVALID_SERVICE'; end if;

  select * into v_rule from public.availability_rules
  where barber_id = p_barber_id
    and day_of_week = extract(dow from p_appointment_date)::integer
    and is_active = true;
  if not found then raise exception 'OUTSIDE_AVAILABILITY'; end if;

  v_start := p_appointment_date + p_appointment_time;
  v_end := v_start + make_interval(mins => v_service.duration_minutes);
  if v_start <= timezone('America/Sao_Paulo', now()) then raise exception 'PAST_APPOINTMENT'; end if;
  if p_appointment_time < v_rule.start_time
     or v_end > p_appointment_date + v_rule.end_time
     or mod((extract(epoch from (p_appointment_time - v_rule.start_time)) / 60)::integer, v_rule.interval_minutes) <> 0
  then raise exception 'OUTSIDE_AVAILABILITY'; end if;

  if exists (
    select 1 from public.blocked_times blocked
    where blocked.barber_id = p_barber_id and blocked.blocked_date = p_appointment_date
      and (blocked.blocked_time is null or blocked.blocked_time = p_appointment_time)
  ) then raise exception 'BLOCKED_TIME'; end if;

  if exists (
    select 1 from public.appointments appointment
    join public.services service on service.id = appointment.service_id
    where appointment.staff_member_id = p_staff_member_id
      and appointment.appointment_date = p_appointment_date
      and appointment.status = 'confirmed'
      and v_start < (appointment.appointment_date + appointment.appointment_time + make_interval(mins => service.duration_minutes))
      and v_end > (appointment.appointment_date + appointment.appointment_time)
  ) then raise exception 'SLOT_CONFLICT'; end if;

  return query insert into public.appointments (
    barber_id, staff_member_id, service_id, client_name, client_whatsapp,
    appointment_date, appointment_time, notes, status, payment_method, payment_status
  ) values (
    p_barber_id, p_staff_member_id, p_service_id, trim(p_client_name), p_client_whatsapp,
    p_appointment_date, p_appointment_time, nullif(trim(p_notes), ''), 'confirmed',
    v_payment_method, 'pending_confirmation'
  ) returning *;
end;
$$;

revoke all on function public.create_public_appointment(uuid, uuid, uuid, text, text, date, time, text, text) from public, anon, authenticated;
grant execute on function public.create_public_appointment(uuid, uuid, uuid, text, text, date, time, text, text) to service_role;

commit;
