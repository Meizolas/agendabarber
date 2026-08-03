-- Fundacao aditiva para autenticacao local e cobranca recorrente.
-- Esta migracao nao remove o Supabase Auth, nao muda o login atual e nao bloqueia acesso.
-- Execute primeiro em homologacao e mantenha um backup antes de aplicar em producao.

begin;

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text,
  auth_source text not null default 'local'
    check (auth_source in ('local', 'supabase')),
  account_status text not null default 'active'
    check (account_status in ('active', 'disabled', 'pending_migration')),
  email_verified_at timestamptz,
  terms_accepted_at timestamptz,
  terms_version text,
  terms_ip inet,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = lower(btrim(email))),
  check (position('@' in email) > 1),
  check (auth_source <> 'local' or password_hash is not null)
);

create unique index if not exists users_email_lower_uidx
  on public.users (lower(email));

-- Preserva os UUIDs atuais para que barbers.user_id possa ser migrado sem reescrever dados.
-- Senhas nao sao copiadas: usuarios existentes definirao uma nova senha em uma fase posterior.
insert into public.users (
  id,
  email,
  password_hash,
  auth_source,
  account_status,
  email_verified_at,
  created_at,
  updated_at
)
select
  au.id,
  lower(btrim(au.email)),
  null,
  'supabase',
  'pending_migration',
  au.email_confirmed_at,
  coalesce(au.created_at, now()),
  now()
from auth.users au
where au.email is not null
on conflict do nothing;

do $$
begin
  if exists (
    select 1
    from public.barbers barber
    left join public.users app_user on app_user.id = barber.user_id
    where app_user.id is null
  ) then
    raise exception 'LEGACY_USER_BACKFILL_INCOMPLETE';
  end if;
end;
$$;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  check (length(token_hash) between 43 and 128),
  check (expires_at > created_at)
);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (length(token_hash) between 43 and 128),
  check (expires_at > created_at),
  check (used_at is null or used_at >= created_at)
);

alter table public.barbers
  add column if not exists access_override_until timestamptz,
  add column if not exists access_override_reason text;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null unique references public.barbers(id) on delete cascade,
  provider text not null default 'asaas' check (provider = 'asaas'),
  provider_customer_id text unique,
  provider_subscription_id text unique,
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment', 'active', 'past_due', 'canceled',
      'refunded', 'chargeback', 'suspended'
    )),
  billing_cycle text not null default 'MONTHLY',
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  grace_until timestamptz,
  canceled_at timestamptz,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    current_period_start is null
    or current_period_end is null
    or current_period_end >= current_period_start
  )
);

create table if not exists public.billing_checkouts (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null default 'asaas' check (provider = 'asaas'),
  provider_checkout_id text unique,
  external_reference text not null unique,
  status text not null default 'creating'
    check (status in ('creating', 'active', 'paid', 'canceled', 'expired', 'failed')),
  checkout_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(external_reference) between 1 and 200)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null default 'asaas' check (provider = 'asaas'),
  provider_payment_id text not null unique,
  provider_subscription_id text,
  billing_type text,
  status text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  net_amount numeric(10, 2) check (net_amount is null or net_amount >= 0),
  due_date date,
  confirmed_at timestamptz,
  received_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'asaas' check (provider = 'asaas'),
  provider_event_id text not null,
  event_type text not null,
  external_reference text,
  barber_id uuid references public.barbers(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  payload jsonb not null,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'processed', 'failed', 'ignored')),
  processing_attempts integer not null default 0 check (processing_attempts >= 0),
  event_created_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (provider, provider_event_id),
  check (length(provider_event_id) between 1 and 200),
  check (jsonb_typeof(payload) = 'object')
);

create index if not exists sessions_user_active_idx
  on public.sessions (user_id, expires_at)
  where revoked_at is null;
create index if not exists sessions_expiration_idx
  on public.sessions (expires_at);
create index if not exists password_reset_tokens_active_idx
  on public.password_reset_tokens (user_id, expires_at)
  where used_at is null;
create index if not exists subscriptions_status_period_idx
  on public.subscriptions (status, current_period_end);
create index if not exists billing_checkouts_barber_created_idx
  on public.billing_checkouts (barber_id, created_at desc);
create index if not exists payments_barber_due_idx
  on public.payments (barber_id, due_date desc);
create index if not exists payments_subscription_idx
  on public.payments (subscription_id, created_at desc);
create index if not exists billing_events_processing_idx
  on public.billing_events (processing_status, received_at);
create index if not exists billing_events_external_reference_idx
  on public.billing_events (external_reference)
  where external_reference is not null;

create or replace function public.agendbarber_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.agendbarber_set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.agendbarber_set_updated_at();

drop trigger if exists billing_checkouts_set_updated_at on public.billing_checkouts;
create trigger billing_checkouts_set_updated_at
before update on public.billing_checkouts
for each row execute function public.agendbarber_set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.agendbarber_set_updated_at();

-- Registra o webhook uma unica vez. O processamento financeiro sera implementado
-- separadamente; eventos duplicados retornam o mesmo ID com was_inserted = false.
create or replace function public.register_billing_event(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_event_created_at timestamptz default null
) returns table(event_id uuid, was_inserted boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_provider is distinct from 'asaas'
     or p_provider_event_id is null
     or length(p_provider_event_id) not between 1 and 200
     or p_event_type is null
     or length(p_event_type) not between 1 and 200
     or p_payload is null
     or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'INVALID_BILLING_EVENT';
  end if;

  -- Evita que duas entregas simultaneas do mesmo webhook observem estados diferentes.
  perform pg_advisory_xact_lock(hashtext(p_provider || ':' || p_provider_event_id));

  return query
  with inserted_event as (
    insert into public.billing_events (
      provider,
      provider_event_id,
      event_type,
      payload,
      event_created_at
    ) values (
      p_provider,
      p_provider_event_id,
      p_event_type,
      p_payload,
      p_event_created_at
    )
    on conflict (provider, provider_event_id) do nothing
    returning id
  )
  select inserted_event.id, true
  from inserted_event
  union all
  select existing.id, false
  from public.billing_events existing
  where existing.provider = p_provider
    and existing.provider_event_id = p_provider_event_id
    and not exists (select 1 from inserted_event)
  limit 1;
end;
$$;

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_checkouts enable row level security;
alter table public.payments enable row level security;
alter table public.billing_events enable row level security;

revoke all on table
  public.users,
  public.sessions,
  public.password_reset_tokens,
  public.subscriptions,
  public.billing_checkouts,
  public.payments,
  public.billing_events
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.users,
  public.sessions,
  public.password_reset_tokens,
  public.subscriptions,
  public.billing_checkouts,
  public.payments,
  public.billing_events
to service_role;

revoke all on function public.register_billing_event(text, text, text, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.register_billing_event(text, text, text, jsonb, timestamptz)
  to service_role;

revoke all on function public.agendbarber_set_updated_at()
  from public, anon, authenticated;

commit;
