begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'billing_events'
      and column_name = 'processing_started_at'
  ) then
    raise exception 'processing_started_at nao existe';
  end if;

  if to_regprocedure('public.claim_billing_event(uuid)') is null then
    raise exception 'claim_billing_event nao existe';
  end if;

  if has_function_privilege('anon', 'public.claim_billing_event(uuid)', 'EXECUTE') then
    raise exception 'anon pode executar claim_billing_event';
  end if;

  if not has_function_privilege('service_role', 'public.claim_billing_event(uuid)', 'EXECUTE') then
    raise exception 'service_role nao pode executar claim_billing_event';
  end if;
end;
$$;

rollback;
