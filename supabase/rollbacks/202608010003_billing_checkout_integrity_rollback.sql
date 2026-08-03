begin;

drop index if exists public.billing_checkouts_one_open_per_barber_uidx;

commit;
