begin;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'billing_checkouts_one_open_per_barber_uidx'
      and indexdef ilike '%unique index%'
  ) then
    raise exception 'indice unico de checkout aberto nao existe';
  end if;
end;
$$;

rollback;
