-- Links publicos e temporarios para o cliente recuperar o evento do calendario.

begin;

create table if not exists public.appointment_calendar_tokens (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists appointment_calendar_tokens_hash_idx
  on public.appointment_calendar_tokens (token_hash);

alter table public.appointment_calendar_tokens enable row level security;
revoke all on table public.appointment_calendar_tokens from public, anon, authenticated;
grant all on table public.appointment_calendar_tokens to service_role;

commit;
