begin;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  name text not null,
  whatsapp text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barber_id, whatsapp)
);

alter table public.appointments add column if not exists customer_id uuid references public.customers(id) on delete set null;
create index if not exists customers_barber_id_idx on public.customers (barber_id);
create index if not exists appointments_customer_id_idx on public.appointments (customer_id);

alter table public.customers enable row level security;
revoke all on table public.customers from public, anon, authenticated;
grant all on table public.customers to service_role;

commit;
