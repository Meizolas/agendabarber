begin;

drop function if exists public.claim_billing_event(uuid);

update public.barbers
set access_override_until = null, access_override_reason = null
where access_override_reason = 'billing_rollout_20260802';

alter table public.billing_events
  drop column if exists processing_started_at;

commit;
