-- Infraestrutura de retry de webhook e janela segura para migrar clientes atuais.

begin;

alter table public.billing_events
  add column if not exists processing_started_at timestamptz;

create or replace function public.claim_billing_event(p_event_id uuid)
returns table(payload jsonb, processing_attempts integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.billing_events event_row
  set
    processing_status = 'processing',
    processing_attempts = event_row.processing_attempts + 1,
    processing_started_at = now(),
    processing_error = null
  where event_row.id = p_event_id
    and (
      event_row.processing_status in ('pending', 'failed')
      or (
        event_row.processing_status = 'processing'
        and event_row.processing_started_at < now() - interval '5 minutes'
      )
    )
  returning event_row.payload, event_row.processing_attempts;
end;
$$;

revoke all on function public.claim_billing_event(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_billing_event(uuid) to service_role;

-- Contas que ja existiam ao aplicar a cobranca recebem uma janela de transicao.
-- Novos cadastros feitos depois desta migration continuam sem override.
update public.barbers barber
set
  access_override_until = now() + interval '14 days',
  access_override_reason = 'billing_rollout_20260802'
where barber.access_override_until is null
  and not exists (
    select 1 from public.subscriptions subscription
    where subscription.barber_id = barber.id
      and subscription.status = 'active'
  );

commit;
