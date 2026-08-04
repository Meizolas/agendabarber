-- Planos por capacidade, equipe da barbearia e agenda por profissional.

begin;

alter table public.subscriptions
  add column if not exists plan_code text not null default 'solo',
  add column if not exists staff_limit smallint not null default 1;

alter table public.billing_checkouts
  add column if not exists plan_code text not null default 'solo',
  add column if not exists amount numeric(10, 2) not null default 39.90;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_plan_code_check') then
    alter table public.subscriptions add constraint subscriptions_plan_code_check
      check (plan_code in ('solo', 'team', 'studio'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_staff_limit_check') then
    alter table public.subscriptions add constraint subscriptions_staff_limit_check
      check (staff_limit in (1, 3, 6));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'billing_checkouts_plan_code_check') then
    alter table public.billing_checkouts add constraint billing_checkouts_plan_code_check
      check (plan_code in ('solo', 'team', 'studio'));
  end if;
end;
$$;

update public.subscriptions
set
  plan_code = case when amount >= 119 then 'studio' when amount >= 79 then 'team' else 'solo' end,
  staff_limit = case when amount >= 119 then 6 when amount >= 79 then 3 else 1 end;

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  name text not null,
  whatsapp text,
  photo_url text,
  is_owner boolean not null default false,
  is_active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(name)) between 2 and 100),
  check (whatsapp is null or length(regexp_replace(whatsapp, '\\D', '', 'g')) between 10 and 13)
);

create unique index if not exists staff_members_one_owner_per_barber_uidx
  on public.staff_members (barber_id) where is_owner;
create index if not exists staff_members_barber_active_order_idx
  on public.staff_members (barber_id, is_active, display_order, created_at);

insert into public.staff_members (barber_id, name, whatsapp, is_owner, display_order)
select barber.id, barber.barber_name, barber.whatsapp, true, 0
from public.barbers barber
where not exists (
  select 1 from public.staff_members member where member.barber_id = barber.id and member.is_owner
);

alter table public.appointments add column if not exists staff_member_id uuid;

update public.appointments appointment
set staff_member_id = member.id
from public.staff_members member
where member.barber_id = appointment.barber_id
  and member.is_owner
  and appointment.staff_member_id is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_staff_member_id_fkey') then
    alter table public.appointments add constraint appointments_staff_member_id_fkey
      foreign key (staff_member_id) references public.staff_members(id) on delete restrict;
  end if;
end;
$$;

create index if not exists appointments_staff_date_status_idx
  on public.appointments (staff_member_id, appointment_date, status);

create or replace function public.agendbarber_enforce_staff_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if not new.is_active then return new; end if;

  perform pg_advisory_xact_lock(hashtext('staff-limit:' || new.barber_id::text));
  select coalesce(subscription.staff_limit, 1) into v_limit
  from public.subscriptions subscription
  where subscription.barber_id = new.barber_id;
  v_limit := coalesce(v_limit, 1);

  select count(*) into v_count
  from public.staff_members member
  where member.barber_id = new.barber_id
    and member.is_active
    and member.id is distinct from new.id;

  if v_count >= v_limit then raise exception 'STAFF_LIMIT_REACHED'; end if;
  return new;
end;
$$;

drop trigger if exists staff_members_enforce_limit on public.staff_members;
create trigger staff_members_enforce_limit
before insert or update of is_active, barber_id on public.staff_members
for each row execute function public.agendbarber_enforce_staff_limit();

create or replace function public.agendbarber_validate_plan_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.staff_members member
  where member.barber_id = new.barber_id and member.is_active;
  if v_count > new.staff_limit then raise exception 'PLAN_BELOW_CURRENT_STAFF'; end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_validate_plan_capacity on public.subscriptions;
create trigger subscriptions_validate_plan_capacity
before insert or update of staff_limit on public.subscriptions
for each row execute function public.agendbarber_validate_plan_capacity();

create or replace function public.agendbarber_create_owner_staff()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.staff_members (barber_id, name, whatsapp, is_owner, display_order)
  values (new.id, new.barber_name, new.whatsapp, true, 0)
  on conflict (barber_id) where is_owner do nothing;
  return new;
end;
$$;

drop trigger if exists barbers_create_owner_staff on public.barbers;
create trigger barbers_create_owner_staff
after insert on public.barbers
for each row execute function public.agendbarber_create_owner_staff();

drop trigger if exists staff_members_set_updated_at on public.staff_members;
create trigger staff_members_set_updated_at
before update on public.staff_members
for each row execute function public.agendbarber_set_updated_at();

create or replace function public.create_public_appointment(
  p_barber_id uuid,
  p_staff_member_id uuid,
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
    appointment_date, appointment_time, notes, status
  ) values (
    p_barber_id, p_staff_member_id, p_service_id, trim(p_client_name), p_client_whatsapp,
    p_appointment_date, p_appointment_time, nullif(trim(p_notes), ''), 'confirmed'
  ) returning *;
end;
$$;

alter table public.staff_members enable row level security;
revoke all on table public.staff_members from public, anon, authenticated;
grant select, insert, update, delete on table public.staff_members to service_role;
revoke all on function public.agendbarber_enforce_staff_limit() from public, anon, authenticated;
revoke all on function public.agendbarber_create_owner_staff() from public, anon, authenticated;
revoke all on function public.agendbarber_validate_plan_capacity() from public, anon, authenticated;
revoke all on function public.create_public_appointment(uuid, uuid, uuid, text, text, date, time, text) from public, anon, authenticated;
grant execute on function public.create_public_appointment(uuid, uuid, uuid, text, text, date, time, text) to service_role;

commit;
