# AgendBarber

Aplicativo de agendamento para barbearias feito com Next.js, Supabase, Tailwind CSS e Evolution API para notificacoes via WhatsApp.

O projeto tem duas experiencias principais:

- Cliente: home, servicos, favoritos, perfil e fluxo publico de agendamento.
- Barbeiro: painel protegido para agenda, servicos, horarios e perfil da barbearia.

## Requisitos

Antes de rodar o projeto, instale:

- Node.js 20 ou superior
- npm 10 ou superior
- Conta/projeto no Supabase
- Git, opcional, mas recomendado
- Evolution API configurada, opcional para WhatsApp

Para conferir se Node e npm estao instalados:

```bash
node -v
npm -v
```

## Instalacao

Na pasta do projeto, instale as dependencias:

```bash
npm install
```

## Variaveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto.

Use este modelo, preenchendo com os dados do seu projeto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Evolution API / WhatsApp
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-evolution
EVOLUTION_INSTANCE_NAME=nome-da-instancia

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Importante:

- Nunca publique `.env.local`.
- A chave `SUPABASE_SERVICE_ROLE_KEY` tem permissao alta no Supabase.
- O `.gitignore` ja ignora arquivos `.env`, `.env.local` e `.env*.local`.

## Configuracao do Supabase

No Supabase, voce precisa configurar:

1. Authentication com login por e-mail e senha.
2. Tabelas do banco.
3. Storage bucket para logos, se quiser upload de imagem no perfil.

### Tabelas necessarias

O app usa estas tabelas:

- `barbers`
- `services`
- `availability_rules`
- `blocked_times`
- `appointments`
- `whatsapp_logs`, opcional para historico futuro

Um SQL inicial possivel:

```sql
create extension if not exists "pgcrypto";

create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  barbershop_name text not null,
  barber_name text not null,
  whatsapp text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null default 0,
  duration_minutes integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  interval_minutes integer not null default 30,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (barber_id, day_of_week)
);

create table if not exists public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  blocked_date date not null,
  blocked_time time,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  client_name text not null,
  client_whatsapp text not null,
  appointment_date date not null,
  appointment_time time not null,
  notes text,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  recipient_type text not null check (recipient_type in ('client', 'barber')),
  phone_number text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);
```

### Storage para logos

Se quiser usar upload de logo/foto no perfil do barbeiro:

1. Acesse Supabase Dashboard.
2. Va em Storage.
3. Crie um bucket chamado `logos`.
4. Deixe o bucket publico se quiser usar as imagens diretamente no app.

## Rodando em desenvolvimento

Inicie o servidor local:

```bash
npm run dev
```

Abra no navegador:

```text
http://localhost:3000
```

Rotas uteis para testar:

```text
/                      Home do cliente
/onboarding            Onboarding
/cliente/servicos      Lista de servicos do cliente
/agendar/demo          Fluxo de agendamento demo
/login                 Login do barbeiro
/cadastro              Cadastro do barbeiro
/dashboard             Painel do barbeiro
/servicos              Gestao de servicos
/horarios              Gestao de horarios
/agendamentos          Agenda do barbeiro
/perfil                Perfil da barbearia
```

## Fluxo basico para usar o app

1. Abra `/cadastro`.
2. Crie a conta do barbeiro.
3. Acesse `/perfil` e confira o link publico.
4. Cadastre servicos em `/servicos`.
5. Configure dias e horarios em `/horarios`.
6. Abra o link publico `/agendar/seu-slug`.
7. Escolha servico, data, horario e confirme o agendamento.

## WhatsApp com Evolution API

O envio de WhatsApp depende destas variaveis:

```env
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=
```

Quando um agendamento e criado, o app chama a Evolution API para enviar notificacoes.

Se essas variaveis nao forem configuradas, o app ainda pode funcionar, mas as mensagens de WhatsApp nao serao enviadas.

## Comandos disponiveis

Rodar em desenvolvimento:

```bash
npm run dev
```

Gerar build de producao:

```bash
npm run build
```

Rodar build de producao:

```bash
npm run start
```

Rodar lint:

```bash
npm run lint
```

## Build para producao

Antes de publicar:

```bash
npm run build
```

Se passar sem erros, rode:

```bash
npm run start
```

Em producao, atualize:

```env
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

## Problemas comuns

### Erro de Supabase URL ou chave

Confira se estas variaveis existem no `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Depois reinicie o servidor:

```bash
npm run dev
```

### Login nao funciona

Verifique no Supabase:

- Authentication esta ativo.
- E-mail/senha esta habilitado.
- As URLs de redirect estao configuradas se usar OAuth/Google.

### Agendamento nao mostra horarios

Confira:

- Existem servicos ativos.
- Existem regras em `availability_rules`.
- A data escolhida bate com um dia configurado.
- Nao existe bloqueio de dia inteiro em `blocked_times`.

### WhatsApp nao envia

Confira:

- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE_NAME`
- Instancia conectada na Evolution API

## Observacao de seguranca

Se alguma chave real foi enviada para repositorio publico ou compartilhada por engano, gere novas chaves no Supabase/Evolution API e substitua no `.env.local`.
