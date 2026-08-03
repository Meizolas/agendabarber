-- ROLLBACK DESTRUTIVO: use somente antes de a nova autenticacao/cobranca receber dados reais.
-- Faça backup antes da execucao. Este arquivo nao e executado automaticamente.

begin;

revoke all on function public.register_billing_event(text, text, text, jsonb, timestamptz)
  from public, anon, authenticated, service_role;
drop function if exists public.register_billing_event(text, text, text, jsonb, timestamptz);

drop trigger if exists payments_set_updated_at on public.payments;
drop trigger if exists billing_checkouts_set_updated_at on public.billing_checkouts;
drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
drop trigger if exists users_set_updated_at on public.users;

drop table if exists public.billing_events;
drop table if exists public.payments;
drop table if exists public.billing_checkouts;
drop table if exists public.subscriptions;
drop table if exists public.password_reset_tokens;
drop table if exists public.sessions;
drop table if exists public.users;

alter table public.barbers
  drop column if exists access_override_reason,
  drop column if exists access_override_until;

drop function if exists public.agendbarber_set_updated_at();

commit;
