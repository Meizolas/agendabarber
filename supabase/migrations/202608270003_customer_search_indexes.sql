-- Índices para acelerar o lookup de clientes por nome e WhatsApp.

begin;

create extension if not exists pg_trgm;

create index if not exists customers_name_trgm_idx
  on public.customers using gin (name gin_trgm_ops);

create index if not exists customers_whatsapp_trgm_idx
  on public.customers using gin (whatsapp gin_trgm_ops);

commit;
