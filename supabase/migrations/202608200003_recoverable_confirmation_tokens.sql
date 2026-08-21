begin;

alter table public.appointment_calendar_tokens add column if not exists public_token text;

update public.appointment_calendar_tokens
set public_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where public_token is null;

create unique index if not exists appointment_calendar_tokens_public_token_idx
  on public.appointment_calendar_tokens (public_token);

alter table public.appointment_calendar_tokens alter column public_token set not null;

commit;
