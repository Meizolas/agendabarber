begin;

insert into public.customers (barber_id, name, whatsapp)
select distinct on (a.barber_id, regexp_replace(a.client_whatsapp, '\D', '', 'g'))
  a.barber_id,
  trim(a.client_name),
  regexp_replace(a.client_whatsapp, '\D', '', 'g')
from public.appointments a
where regexp_replace(a.client_whatsapp, '\D', '', 'g') <> ''
order by a.barber_id, regexp_replace(a.client_whatsapp, '\D', '', 'g'), a.created_at desc
on conflict (barber_id, whatsapp) do update
set name = excluded.name,
    updated_at = now();

update public.appointments a
set customer_id = c.id
from public.customers c
where a.customer_id is null
  and c.barber_id = a.barber_id
  and c.whatsapp = regexp_replace(a.client_whatsapp, '\D', '', 'g');

commit;
