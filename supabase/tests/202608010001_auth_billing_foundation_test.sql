-- Execute em homologacao depois da migration 202608010001.
-- Todo dado criado por este teste e descartado no ROLLBACK final.

begin;

do $$
declare
  required_table text;
  required_tables text[] := array[
    'users',
    'sessions',
    'password_reset_tokens',
    'subscriptions',
    'billing_checkouts',
    'payments',
    'billing_events'
  ];
begin
  foreach required_table in array required_tables loop
    if to_regclass('public.' || required_table) is null then
      raise exception 'MISSING_TABLE: public.%', required_table;
    end if;
  end loop;

  if exists (
    select 1
    from public.barbers barber
    left join public.users app_user on app_user.id = barber.user_id
    where app_user.id is null
  ) then
    raise exception 'LEGACY_USER_BACKFILL_INCOMPLETE';
  end if;

  if has_table_privilege('anon', 'public.users', 'select')
     or has_table_privilege('authenticated', 'public.users', 'select')
     or has_table_privilege('anon', 'public.billing_events', 'select')
     or has_table_privilege('authenticated', 'public.billing_events', 'select') then
    raise exception 'SENSITIVE_TABLE_PRIVILEGE_EXPOSED';
  end if;
end;
$$;

do $$
declare
  first_id uuid;
  second_id uuid;
  first_inserted boolean;
  second_inserted boolean;
begin
  select event_id, was_inserted
  into first_id, first_inserted
  from public.register_billing_event(
    'asaas',
    'phase2-idempotency-test',
    'CHECKOUT_CREATED',
    '{"test": true}'::jsonb,
    now()
  );

  select event_id, was_inserted
  into second_id, second_inserted
  from public.register_billing_event(
    'asaas',
    'phase2-idempotency-test',
    'CHECKOUT_CREATED',
    '{"test": true}'::jsonb,
    now()
  );

  if first_id is null
     or first_id is distinct from second_id
     or first_inserted is distinct from true
     or second_inserted is distinct from false then
    raise exception 'BILLING_EVENT_IDEMPOTENCY_FAILED';
  end if;
end;
$$;

rollback;
