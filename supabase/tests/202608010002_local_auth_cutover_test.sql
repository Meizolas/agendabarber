-- Execute depois de 202608010002_local_auth_cutover.sql.
-- Este teste e somente de estrutura/permissoes e nao altera dados.

begin;

do $$
declare
  referenced_table regclass;
begin
  select constraint_row.confrelid::regclass
  into referenced_table
  from pg_constraint constraint_row
  where constraint_row.conname = 'barbers_user_id_app_users_fkey'
    and constraint_row.conrelid = 'public.barbers'::regclass;

  if referenced_table is distinct from 'public.users'::regclass then
    raise exception 'barbers.user_id nao referencia public.users';
  end if;

  if to_regprocedure(
    'public.create_local_account(uuid,text,text,text,text,text,text,text,inet)'
  ) is null then
    raise exception 'create_local_account nao existe';
  end if;

  if to_regprocedure('public.complete_password_reset(text,text)') is null then
    raise exception 'complete_password_reset nao existe';
  end if;

  if has_function_privilege(
    'anon',
    'public.create_local_account(uuid,text,text,text,text,text,text,text,inet)',
    'EXECUTE'
  ) then
    raise exception 'anon pode executar create_local_account';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.complete_password_reset(text,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated pode executar complete_password_reset';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.complete_password_reset(text,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role nao pode executar complete_password_reset';
  end if;
end;
$$;

rollback;
