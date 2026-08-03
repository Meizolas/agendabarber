-- Impede que cliques simultaneos criem mais de um checkout aberto por barbearia.

begin;

do $$
begin
  if exists (
    select 1
    from public.billing_checkouts
    where status in ('creating', 'active')
    group by barber_id
    having count(*) > 1
  ) then
    raise exception 'MULTIPLE_OPEN_BILLING_CHECKOUTS';
  end if;
end;
$$;

create unique index if not exists billing_checkouts_one_open_per_barber_uidx
  on public.billing_checkouts (barber_id)
  where status in ('creating', 'active');

commit;
