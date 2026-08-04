-- Garante os valores comerciais atuais mesmo se a migracao anterior ja foi aplicada.

begin;

alter table public.billing_checkouts alter column amount set default 39.90;

update public.subscriptions
set amount = case plan_code
  when 'team' then 79.90
  when 'studio' then 119.90
  else 39.90
end
where provider_subscription_id is null;

commit;
