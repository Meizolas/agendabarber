# AgendBarber

Aplicativo de agendamento para barbearias feito com Next.js, Supabase, Tailwind CSS e Asaas para assinatura recorrente.

O projeto tem duas experiencias principais:

- Barbeiro: painel protegido para agenda, servicos, horarios e perfil da barbearia.
- Cliente final: acessa apenas o link publico da barbearia para agendar, sem criar conta.

## Requisitos

Antes de rodar o projeto, instale:

- Node.js 20 ou superior
- npm 10 ou superior
- Conta/projeto no Supabase
- Git, opcional, mas recomendado

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

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Recuperacao de senha (Resend)
RESEND_API_KEY=re_xxxxxxxxx
AUTH_EMAIL_FROM=AgendBarber <contato@seu-dominio.com>

# Asaas (use a chave correspondente ao ambiente da URL)
ASAAS_API_URL=https://api-sandbox.asaas.com/v3
ASAAS_API_KEY=sua-chave-sandbox
ASAAS_WEBHOOK_TOKEN=gere-um-token-exclusivo-para-webhook
ASAAS_WEBHOOK_EMAIL=financeiro@seu-dominio.com
```

Importante:

- Nunca publique `.env.local`.
- A chave `SUPABASE_SERVICE_ROLE_KEY` tem permissao alta no Supabase.
- O `.gitignore` ja ignora arquivos `.env`, `.env.local` e `.env*.local`.
- Os valores dos planos ficam no codigo em `src/lib/billing/plans.ts`, nao em variavel de ambiente.

## Configuracao do Supabase

No Supabase, voce precisa configurar:

1. Banco PostgreSQL e a chave `service_role` para a autenticacao propria do app.
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
  image_url text,
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

### Imagens dos servicos

O formulario de servicos aceita uma URL publica em `image_url`. Se sua tabela `services` foi criada antes dessa versao, rode:

```sql
alter table public.services
add column if not exists image_url text;
```

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
/                      Redireciona para login ou dashboard
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

## Publicacao na Vercel

Antes de publicar pela primeira vez:

1. Crie as tabelas descritas neste README, caso ainda nao existam.
2. Execute no SQL Editor do Supabase, nesta ordem:

```text
supabase/migrations/202607220001_production_hardening.sql
supabase/migrations/202608010001_auth_billing_foundation.sql
supabase/migrations/202608010002_local_auth_cutover.sql
supabase/migrations/202608010003_billing_checkout_integrity.sql
supabase/migrations/202608020001_billing_webhook_access.sql
```

Essas migracoes sao obrigatorias. A primeira ativa RLS, impede acesso direto do navegador as
tabelas, adiciona rate limit compartilhado entre as funcoes da Vercel e cria a
funcao transacional que valida e registra agendamentos sem colisao de horarios.

A segunda prepara, sem ativar, a autenticacao local e a cobranca recorrente. Ela
cria as tabelas `users`, `sessions`, `password_reset_tokens`, `subscriptions`,
`billing_checkouts`, `payments` e `billing_events`, preservando os UUIDs dos
usuarios atuais. Aplicar essa fundacao nao remove o Supabase Auth e nao bloqueia
o acesso existente. O rollback correspondente fica em
`supabase/rollbacks/202608010001_auth_billing_foundation_rollback.sql` e e
destrutivo; use-o somente antes de existirem dados reais nas novas tabelas.
Depois de aplicar a segunda migration em homologacao, execute
`supabase/tests/202608010001_auth_billing_foundation_test.sql`; o teste valida
tabelas, backfill, permissoes e idempotencia e termina com `ROLLBACK`.

A terceira migration ativa a autenticacao propria: troca a chave estrangeira de
`barbers.user_id` para `public.users` e instala as funcoes transacionais de
cadastro e redefinicao de senha. Depois dela, execute
`supabase/tests/202608010002_local_auth_cutover_test.sql`. Novas contas deixam de
ser criadas no Supabase Auth. Contas antigas com e-mail e senha sao migradas
automaticamente no primeiro login bem-sucedido; sessoes antigas continuam
aceitas temporariamente durante a transicao.

A quarta migration adiciona a garantia de apenas um checkout aberto por
barbearia. Depois dela, execute
`supabase/tests/202608010003_billing_checkout_integrity_test.sql`.

O cadastro direciona novas contas para `/assinatura`. Ao clicar para assinar, o
servidor cria um Checkout recorrente mensal e redireciona o usuario para a pagina
hospedada pelo Asaas. O app nao recebe numero, validade nem CVV do cartao. O
retorno visual do Checkout nao ativa a assinatura; a confirmacao financeira deve
vir pelo webhook autenticado do Asaas.

A quinta migration adiciona retry seguro para eventos interrompidos e concede
uma janela de transicao de 14 dias apenas para as barbearias que ja existiam no
momento da aplicacao. Novas contas continuam bloqueadas ate a confirmacao do
pagamento. Depois dela, execute
`supabase/tests/202608020001_billing_webhook_access_test.sql`.

3. Importe o repositorio na Vercel com o preset `Next.js` e mantenha os comandos
padrao (`npm run build` e output gerenciado pelo Next.js).
4. Cadastre todas as variaveis de `.env.example` em Project Settings > Environment
Variables. Cadastre segredos apenas como variaveis server-side; nunca adicione o
prefixo `NEXT_PUBLIC_` na chave `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY`,
`ASAAS_WEBHOOK_TOKEN` ou nas chaves da Evolution.
5. No Resend, valide o dominio usado em `AUTH_EMAIL_FROM` para habilitar a
recuperacao de senha em producao.
6. Aponte `NEXT_PUBLIC_APP_URL` para o dominio final, sem barra no fim, e faca um
novo deploy depois de alterar essa variavel.
7. No Asaas, crie um Webhook com envio sequencial usando:

```text
URL: https://seu-dominio.com/api/webhooks/asaas
Token de autenticacao: o mesmo valor de ASAAS_WEBHOOK_TOKEN
```

Habilite os eventos `CHECKOUT_CREATED`, `CHECKOUT_PAID`, `CHECKOUT_CANCELED`,
`CHECKOUT_EXPIRED`, `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`,
`SUBSCRIPTION_INACTIVATED`, `SUBSCRIPTION_DELETED`, `PAYMENT_CREATED`,
`PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`,
`PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_REFUND_IN_PROGRESS`,
`PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE` e
`PAYMENT_AWAITING_CHARGEBACK_REVERSAL`.

Use os hosts atuais `https://api-sandbox.asaas.com/v3` em homologacao e
`https://api.asaas.com/v3` em producao. O cliente ainda normaliza os endpoints
legados do Asaas para facilitar a migracao, mas eles nao devem ser usados em uma
nova configuracao.

Depois de configurar um dominio HTTPS publico e o e-mail operacional, crie ou
atualize o Webhook de forma idempotente com:

```bash
npm run asaas:webhook:configure
```

Em `.env.local`, o caractere `$` inicial da API Key precisa ser escapado como
`\$`. Variaveis cadastradas diretamente na Vercel devem manter a chave original,
sem a barra invertida.

Depois do deploy, valide nesta ordem:

- criar uma conta real;
- cadastrar perfil, servico e disponibilidade;
- abrir `/agendar/seu-slug` em uma janela anonima;
- confirmar que datas passadas e horarios fora do expediente nao aparecem;
- criar um agendamento e tentar repetir ou sobrepor o mesmo periodo;
- confirmar o registro no painel;
- testar o envio de WhatsApp, caso a Evolution API esteja configurada.

O app considera o fuso `America/Sao_Paulo` para agenda, validacao de datas e painel.
A Evolution API precisa estar acessivel pela internet via HTTPS; enderecos locais
ou privados nao podem ser acessados pelas funcoes da Vercel.

## Teste gratuito e cupons

A migration `202608060002_trials_and_coupons.sql` libera sete dias de teste
gratuito para novas barbearias. Contas existentes nao recebem um novo trial
automaticamente. Durante o trial, o plano disponivel e o Essencial.

Os codigos promocionais sao criados em `billing_coupons`, e nao no painel do
Asaas. Exemplo de cupom de 50% na primeira mensalidade:

```sql
insert into public.billing_coupons (
  code, description, discount_type, discount_value, plan_codes,
  valid_until, max_redemptions, new_customers_only
) values (
  'BAIRRO50',
  '50% na primeira mensalidade',
  'percentage',
  50,
  array['solo', 'team', 'studio'],
  '2026-12-31 23:59:59-03',
  100,
  true
);
```

Exemplo de desconto fixo de R$ 20 apenas no Essencial:

```sql
insert into public.billing_coupons (
  code, description, discount_type, discount_value, plan_codes,
  max_redemptions, new_customers_only
) values (
  'ESSENCIAL20',
  'R$ 20 de desconto na primeira mensalidade',
  'fixed',
  20,
  array['solo'],
  50,
  true
);
```

O checkout cria a primeira cobranca com o valor promocional. No evento de
assinatura, o app restaura no Asaas o preco integral das renovacoes com
`updatePendingPayments: false`, preservando o desconto da primeira cobranca.
Por isso, os eventos de assinatura e pagamento do Webhook sao obrigatorios.

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

Confira se as migrations foram executadas na ordem documentada e se
`SUPABASE_SERVICE_ROLE_KEY` esta configurada apenas no servidor. Para contas
legadas que ainda nao foram migradas, o login por e-mail/senha do Supabase Auth
precisa permanecer habilitado durante a janela de transicao.

### Recuperacao de senha nao envia e-mail

Confira `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, a validacao do dominio no Resend e
`NEXT_PUBLIC_APP_URL` apontando para o dominio correto.

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
