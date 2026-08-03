-- Use somente antes de existirem usuarios exclusivamente locais.

begin;

drop function if exists public.complete_password_reset(text, text);
drop function if exists public.create_local_account(
  uuid, text, text, text, text, text, text, text, inet
);

do $$
begin
  if exists (
    select 1
    from public.barbers barber
    left join auth.users legacy_user on legacy_user.id = barber.user_id
    where legacy_user.id is null
  ) then
    raise exception 'LOCAL_ONLY_USERS_PREVENT_ROLLBACK';
  end if;
end;
$$;

alter table public.barbers
  drop constraint if exists barbers_user_id_app_users_fkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'barbers_user_id_fkey'
      and conrelid = 'public.barbers'::regclass
  ) then
    alter table public.barbers
      add constraint barbers_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end;
$$;

commit;
