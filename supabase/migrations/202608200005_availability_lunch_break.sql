begin;

alter table public.availability_rules
  add column if not exists lunch_start_time time,
  add column if not exists lunch_end_time time;

alter table public.availability_rules drop constraint if exists availability_rules_lunch_check;
alter table public.availability_rules add constraint availability_rules_lunch_check check (
  (lunch_start_time is null and lunch_end_time is null)
  or (lunch_start_time is not null and lunch_end_time is not null
    and lunch_start_time < lunch_end_time
    and lunch_start_time >= start_time and lunch_end_time <= end_time)
);

create or replace function public.prevent_appointment_during_lunch()
returns trigger language plpgsql set search_path = public as $$
declare
  v_rule public.availability_rules%rowtype;
  v_duration integer;
  v_start timestamp;
  v_end timestamp;
begin
  if new.status <> 'confirmed' then return new; end if;
  select * into v_rule from public.availability_rules
  where barber_id = new.barber_id and day_of_week = extract(dow from new.appointment_date)::integer and is_active = true;
  select duration_minutes into v_duration from public.services where id = new.service_id;
  if v_rule.lunch_start_time is not null and v_rule.lunch_end_time is not null then
    v_start := new.appointment_date + new.appointment_time;
    v_end := v_start + make_interval(mins => v_duration);
    if v_start < new.appointment_date + v_rule.lunch_end_time and v_end > new.appointment_date + v_rule.lunch_start_time then
      raise exception 'LUNCH_BREAK';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_prevent_lunch_overlap on public.appointments;
create trigger appointments_prevent_lunch_overlap
before insert or update of appointment_date, appointment_time, service_id, barber_id, status on public.appointments
for each row execute function public.prevent_appointment_during_lunch();

commit;
