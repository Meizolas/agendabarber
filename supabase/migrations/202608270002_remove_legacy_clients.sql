-- Remove a estrutura legada clients/client_id depois da migracao para customers.
-- Esta migration e destrutiva e deve ser aplicada somente apos validar o banco.

begin;

do $$
declare
  has_legacy_table boolean;
  has_legacy_column boolean;
  missing_customer_count integer;
begin
  has_legacy_table := to_regclass('public.clients') is not null;
  has_legacy_column := exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'client_id'
  );

  if has_legacy_table and has_legacy_column then
    execute $query$
      select count(*)
      from public.appointments appointment
      left join public.clients legacy_client on legacy_client.id = appointment.client_id
      where appointment.client_id is not null
        and legacy_client.id is null
    $query$ into missing_customer_count;

    if missing_customer_count > 0 then
      raise exception 'LEGACY_CLIENTS_ORPHANED_APPOINTMENTS:%', missing_customer_count;
    end if;

    execute $query$
      select count(*)
      from public.appointments
      where client_id is not null
        and customer_id is null
    $query$ into missing_customer_count;

    if missing_customer_count > 0 then
      raise exception 'LEGACY_CLIENTS_NOT_MIGRATED_TO_CUSTOMERS:%', missing_customer_count;
    end if;
  end if;
end;
$$;

alter table public.appointments
  drop constraint if exists appointments_client_id_fkey;

drop index if exists public.appointments_client_idx;

alter table public.appointments
  drop column if exists client_id;

drop trigger if exists clients_set_updated_at on public.clients;
drop index if exists public.clients_barber_name_idx;
drop index if exists public.clients_barber_last_appointment_idx;

drop table if exists public.clients;

commit;
