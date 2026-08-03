-- Move apenas a integridade referencial de barbers.user_id para public.users.
-- Os UUIDs foram preservados pela migration 202608010001, portanto o app legado
-- continua encontrando a mesma barbearia durante a transicao.

begin;

do $$
begin
  if exists (
    select 1
    from public.barbers barber
    left join public.users app_user on app_user.id = barber.user_id
    where app_user.id is null
  ) then
    raise exception 'LOCAL_AUTH_USER_BACKFILL_INCOMPLETE';
  end if;
end;
$$;

do $$
declare
  legacy_constraint record;
begin
  for legacy_constraint in
    select constraint_row.conname
    from pg_constraint constraint_row
    where constraint_row.contype = 'f'
      and constraint_row.conrelid = 'public.barbers'::regclass
      and constraint_row.confrelid = 'auth.users'::regclass
  loop
    execute format(
      'alter table public.barbers drop constraint %I',
      legacy_constraint.conname
    );
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'barbers_user_id_app_users_fkey'
      and conrelid = 'public.barbers'::regclass
  ) then
    alter table public.barbers
      add constraint barbers_user_id_app_users_fkey
      foreign key (user_id) references public.users(id) on delete cascade;
  end if;
end;
$$;

create or replace function public.create_local_account(
  p_user_id uuid,
  p_email text,
  p_password_hash text,
  p_barber_name text,
  p_barbershop_name text,
  p_whatsapp text,
  p_slug text,
  p_terms_version text,
  p_terms_ip inet default null
) returns table(user_id uuid, barber_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_barber_id uuid;
begin
  insert into public.users (
    id,
    email,
    password_hash,
    auth_source,
    account_status,
    email_verified_at,
    terms_accepted_at,
    terms_version,
    terms_ip
  ) values (
    p_user_id,
    lower(btrim(p_email)),
    p_password_hash,
    'local',
    'active',
    null,
    now(),
    p_terms_version,
    p_terms_ip
  );

  insert into public.barbers (
    user_id,
    barber_name,
    barbershop_name,
    whatsapp,
    slug
  ) values (
    p_user_id,
    btrim(p_barber_name),
    btrim(p_barbershop_name),
    p_whatsapp,
    lower(btrim(p_slug))
  )
  returning id into created_barber_id;

  return query select p_user_id, created_barber_id;
end;
$$;

create or replace function public.complete_password_reset(
  p_token_hash text,
  p_password_hash text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  reset_token public.password_reset_tokens%rowtype;
begin
  select * into reset_token
  from public.password_reset_tokens
  where token_hash = p_token_hash
    and used_at is null
    and expires_at > now()
  for update;

  if not found then return null; end if;

  update public.users
  set
    password_hash = p_password_hash,
    auth_source = 'local',
    account_status = 'active',
    email_verified_at = coalesce(email_verified_at, now())
  where id = reset_token.user_id;

  update public.password_reset_tokens
  set used_at = now()
  where id = reset_token.id;

  update public.sessions
  set revoked_at = now()
  where user_id = reset_token.user_id and revoked_at is null;

  return reset_token.user_id;
end;
$$;

revoke all on function public.create_local_account(
  uuid, text, text, text, text, text, text, text, inet
) from public, anon, authenticated;
grant execute on function public.create_local_account(
  uuid, text, text, text, text, text, text, text, inet
) to service_role;

revoke all on function public.complete_password_reset(text, text)
  from public, anon, authenticated;
grant execute on function public.complete_password_reset(text, text)
  to service_role;

commit;
