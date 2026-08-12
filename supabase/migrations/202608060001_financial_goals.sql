-- Metas financeiras mensais, isoladas por barbearia.

begin;

create table if not exists public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  month_start date not null,
  target_amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_goals_target_positive check (target_amount > 0),
  constraint financial_goals_month_start_check check (month_start = date_trunc('month', month_start)::date),
  unique (barber_id, month_start)
);

create index if not exists financial_goals_barber_month_idx
  on public.financial_goals (barber_id, month_start desc);

drop trigger if exists financial_goals_set_updated_at on public.financial_goals;
create trigger financial_goals_set_updated_at
before update on public.financial_goals
for each row execute function public.agendbarber_set_updated_at();

alter table public.financial_goals enable row level security;
revoke all on table public.financial_goals from public, anon, authenticated;
grant all on table public.financial_goals to service_role;

commit;
