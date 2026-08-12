-- Novos precos dos planos e dispositivos autorizados a receber Web Push.

begin;

alter table public.billing_checkouts alter column amount set default 19.90;

update public.subscriptions
set amount = case plan_code
  when 'team' then 49.90
  when 'studio' then 79.90
  else 19.90
end
where provider_subscription_id is null
  and status = 'pending_payment';

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(endpoint) between 20 and 2048),
  check (length(p256dh) between 20 and 512),
  check (length(auth) between 8 and 256)
);

create index if not exists push_subscriptions_barber_active_idx
  on public.push_subscriptions (barber_id, is_active);

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.agendbarber_set_updated_at();

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from public, anon, authenticated;
grant all on table public.push_subscriptions to service_role;

commit;
