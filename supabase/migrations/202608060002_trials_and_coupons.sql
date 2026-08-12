-- Teste gratuito de 7 dias e cupons aplicáveis somente à primeira mensalidade.

begin;

alter table public.barbers
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_plan_code text,
  add column if not exists trial_converted_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'barbers_trial_plan_code_check') then
    alter table public.barbers add constraint barbers_trial_plan_code_check
      check (trial_plan_code is null or trial_plan_code in ('solo', 'team', 'studio'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'barbers_trial_period_check') then
    alter table public.barbers add constraint barbers_trial_period_check
      check (trial_started_at is null or trial_ends_at is null or trial_ends_at > trial_started_at);
  end if;
end;
$$;

create or replace function public.agendbarber_start_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trial_started_at is null and new.trial_ends_at is null then
    new.trial_started_at := now();
    new.trial_ends_at := now() + interval '7 days';
    new.trial_plan_code := 'solo';
  end if;
  return new;
end;
$$;

drop trigger if exists barbers_start_trial on public.barbers;
create trigger barbers_start_trial
before insert on public.barbers
for each row execute function public.agendbarber_start_trial();

create table if not exists public.billing_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10, 2) not null check (discount_value > 0),
  plan_codes text[] not null default array['solo', 'team', 'studio']::text[],
  valid_from timestamptz,
  valid_until timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  first_payment_only boolean not null default true check (first_payment_only = true),
  new_customers_only boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (code = upper(btrim(code))),
  check (length(code) between 3 and 40),
  check (code ~ '^[A-Z0-9_-]+$'),
  check (discount_type <> 'percentage' or discount_value <= 100),
  check (cardinality(plan_codes) > 0),
  check (plan_codes <@ array['solo', 'team', 'studio']::text[]),
  check (valid_from is null or valid_until is null or valid_until > valid_from)
);

create unique index if not exists billing_coupons_code_uidx on public.billing_coupons (code);
create index if not exists billing_coupons_active_validity_idx
  on public.billing_coupons (is_active, valid_until);

create table if not exists public.billing_coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.billing_coupons(id) on delete restrict,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  checkout_id uuid references public.billing_checkouts(id) on delete set null,
  plan_code text not null check (plan_code in ('solo', 'team', 'studio')),
  original_amount numeric(10, 2) not null check (original_amount > 0),
  discount_amount numeric(10, 2) not null check (discount_amount > 0),
  final_amount numeric(10, 2) not null check (final_amount >= 1),
  status text not null default 'reserved' check (status in ('reserved', 'applied', 'released')),
  reserved_at timestamptz not null default now(),
  redeemed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coupon_id, barber_id)
);

create index if not exists billing_coupon_redemptions_barber_idx
  on public.billing_coupon_redemptions (barber_id, status);

alter table public.billing_checkouts
  add column if not exists coupon_redemption_id uuid references public.billing_coupon_redemptions(id) on delete set null,
  add column if not exists coupon_code text,
  add column if not exists original_amount numeric(10, 2),
  add column if not exists checkout_amount numeric(10, 2),
  add column if not exists recurring_price_restored_at timestamptz;

drop trigger if exists billing_coupons_set_updated_at on public.billing_coupons;
create trigger billing_coupons_set_updated_at
before update on public.billing_coupons
for each row execute function public.agendbarber_set_updated_at();

drop trigger if exists billing_coupon_redemptions_set_updated_at on public.billing_coupon_redemptions;
create trigger billing_coupon_redemptions_set_updated_at
before update on public.billing_coupon_redemptions
for each row execute function public.agendbarber_set_updated_at();

create or replace function public.reserve_billing_coupon(
  p_code text,
  p_barber_id uuid,
  p_subscription_id uuid,
  p_checkout_id uuid,
  p_plan_code text,
  p_original_amount numeric
) returns table (
  redemption_id uuid,
  coupon_code text,
  discount_amount numeric,
  final_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.billing_coupons%rowtype;
  v_discount numeric(10, 2);
  v_redemption_id uuid;
begin
  select * into v_coupon
  from public.billing_coupons
  where code = upper(btrim(p_code))
  for update;

  if not found or not v_coupon.is_active then raise exception 'COUPON_INVALID'; end if;
  if v_coupon.valid_from is not null and now() < v_coupon.valid_from then raise exception 'COUPON_NOT_STARTED'; end if;
  if v_coupon.valid_until is not null and now() >= v_coupon.valid_until then raise exception 'COUPON_EXPIRED'; end if;
  if not (p_plan_code = any(v_coupon.plan_codes)) then raise exception 'COUPON_PLAN_NOT_ALLOWED'; end if;
  if v_coupon.max_redemptions is not null and v_coupon.redemption_count >= v_coupon.max_redemptions then
    raise exception 'COUPON_LIMIT_REACHED';
  end if;
  if exists (
    select 1 from public.billing_coupon_redemptions redemption
    where redemption.coupon_id = v_coupon.id
      and redemption.barber_id = p_barber_id
      and redemption.status <> 'released'
  ) then raise exception 'COUPON_ALREADY_USED'; end if;
  if v_coupon.new_customers_only and exists (
    select 1 from public.payments payment
    where payment.barber_id = p_barber_id
      and payment.status in ('CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH')
  ) then raise exception 'COUPON_NEW_CUSTOMERS_ONLY'; end if;

  v_discount := case
    when v_coupon.discount_type = 'percentage'
      then round(p_original_amount * v_coupon.discount_value / 100, 2)
    else least(v_coupon.discount_value, p_original_amount - 1)
  end;
  v_discount := least(v_discount, p_original_amount - 1);
  if v_discount <= 0 then raise exception 'COUPON_NO_DISCOUNT'; end if;

  insert into public.billing_coupon_redemptions (
    coupon_id, barber_id, subscription_id, checkout_id, plan_code,
    original_amount, discount_amount, final_amount
  ) values (
    v_coupon.id, p_barber_id, p_subscription_id, p_checkout_id, p_plan_code,
    p_original_amount, v_discount, p_original_amount - v_discount
  )
  on conflict (coupon_id, barber_id) do update set
    subscription_id = excluded.subscription_id,
    checkout_id = excluded.checkout_id,
    plan_code = excluded.plan_code,
    original_amount = excluded.original_amount,
    discount_amount = excluded.discount_amount,
    final_amount = excluded.final_amount,
    status = 'reserved',
    reserved_at = now(),
    redeemed_at = null,
    released_at = null
  where billing_coupon_redemptions.status = 'released'
  returning id into v_redemption_id;

  if v_redemption_id is null then raise exception 'COUPON_ALREADY_USED'; end if;

  update public.billing_coupons
  set redemption_count = redemption_count + 1
  where id = v_coupon.id;

  return query select v_redemption_id, v_coupon.code, v_discount, p_original_amount - v_discount;
end;
$$;

create or replace function public.release_billing_coupon(p_redemption_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon_id uuid;
begin
  update public.billing_coupon_redemptions
  set status = 'released', released_at = now()
  where id = p_redemption_id and status = 'reserved'
  returning coupon_id into v_coupon_id;

  if v_coupon_id is not null then
    update public.billing_coupons
    set redemption_count = greatest(0, redemption_count - 1)
    where id = v_coupon_id;
  end if;
end;
$$;

alter table public.billing_coupons enable row level security;
alter table public.billing_coupon_redemptions enable row level security;
revoke all on table public.billing_coupons, public.billing_coupon_redemptions from public, anon, authenticated;
revoke all on function public.reserve_billing_coupon(text, uuid, uuid, uuid, text, numeric) from public, anon, authenticated;
revoke all on function public.release_billing_coupon(uuid) from public, anon, authenticated;
grant all on table public.billing_coupons, public.billing_coupon_redemptions to service_role;
grant execute on function public.reserve_billing_coupon(text, uuid, uuid, uuid, text, numeric) to service_role;
grant execute on function public.release_billing_coupon(uuid) to service_role;

commit;
