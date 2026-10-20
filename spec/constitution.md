# Constituição do AgendBarber

> Documento de contexto técnico e regras de evolução do produto.
>
> Estado analisado em 27/08/2026. Este arquivo descreve o comportamento observado no código e nas migrations existentes; quando houver divergência, o código/migration executado é a fonte de verdade e esta constituição deve ser atualizada na mesma mudança.

## 1. Propósito e escopo

O AgendBarber é um SaaS de agenda para barbearias. Existem duas experiências:

1. **Gestor/barbeiro**: autenticação, onboarding, perfil, serviços, horários, bloqueios, equipe, agenda, metas financeiras, assinatura e notificações.
2. **Cliente final**: link público `/agendar/[slug]`, sem criação de conta, para escolher profissional, serviço, data, horário e forma de pagamento.

O produto é mobile-first, com área principal limitada visualmente a aproximadamente 430px, tema escuro e identidade visual premium com amarelo/dourado como cor de ação.

## 2. Stack e runtime

- Node.js `>=20.9.0` e npm.
- Next.js `16.2.12`, App Router, React `19.2.8`, TypeScript 5 em modo `strict`.
- Tailwind CSS 3, PostCSS/Autoprefixer, `tailwindcss-animate`.
- Radix UI/shadcn-style primitives para componentes acessíveis de diálogo, toast, select, label etc.
- `lucide-react` para ícones e `framer-motion` para animações.
- Supabase PostgreSQL como persistência; `@supabase/ssr` para cliente browser/server e `@supabase/supabase-js` para o cliente administrativo.
- Zod + React Hook Form para validação de entrada e formulários.
- `date-fns` para datas, `Intl.DateTimeFormat` para partes no fuso oficial.
- Asaas para checkout recorrente e assinatura.
- Evolution API para mensagens WhatsApp.
- Resend para recuperação de senha.
- Web Push/VAPID para notificações de novo agendamento.
- QR Code e payload EMV/PIX estático para pagamento do serviço.
- Deploy previsto na Vercel; a aplicação é compatível com funções serverless e não deve depender de estado local persistente.

Scripts oficiais:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run asaas:webhook:configure`

## 3. Organização do código

### 3.1 `src/app`

Contém páginas, layouts e Route Handlers do App Router.

- `(auth)`: login, cadastro, esqueci/redefinição de senha.
- `(dashboard)`: área protegida de dashboard, agendamentos, serviços, horários, equipe, perfil e assinatura.
- `agendar/[slug]`: experiência pública da barbearia.
- `api`: backend HTTP interno da aplicação.
- `layout.tsx`: metadados, fonte Inter, tema global, `Toaster` e recuperação de chunk.
- `(dashboard)/layout.tsx`: guarda de autenticação, shell mobile, sidebar, tour e prompt de push.

### 3.2 `src/components`

- `auth`: shells e formulários de autenticação.
- `booking`: seleção de serviço, data, horário, dados do cliente e sucesso.
- `dashboard`: cartões, header/sidebar, indicadores, agenda e cadastro manual.
- `services`, `schedule`, `billing`, `premium`, `pwa`, `tour`, `shared`.
- `ui`: primitives reutilizáveis com padrão shadcn/Radix.

### 3.3 `src/lib`

Bibliotecas de domínio e integrações, sem colocar regra importante diretamente em componentes:

- `auth`: sessão local, hashing Argon2, compatibilidade com Supabase Auth e e-mail.
- `supabase`: cliente browser, server-side e `service_role`.
- `validations`: schemas Zod compartilhados por domínio.
- `utils`: datas, slots, status de abertura, formatação, device, URLs e classes.
- `billing`/`asaas`: planos, autorização de acesso, checkout, webhook e conciliação.
- `whatsapp`, `push`, `pix`, `finance`, `security`, `demo`.

### 3.4 Aliases e estilo

Usar o alias `@/*` apontando para `src/*`. Preferir imports absolutos `@/lib/...`, `@/components/...` e `@/types`. Componentes interativos devem declarar `'use client'`; páginas e layouts devem permanecer server-side quando não houver necessidade de estado/browser.

## 4. Arquitetura e fronteiras

O sistema segue um monólito full-stack Next.js:

```text
Browser
  -> páginas React / fetch('/api/...')
  -> Route Handlers Next.js
  -> autenticação + Zod + autorização por barber_id
  -> Supabase service_role ou RPC transacional
  -> PostgreSQL / integrações externas
```

Princípios obrigatórios:

1. Toda mutação passa por Route Handler, validação Zod e autorização server-side.
2. O browser não acessa diretamente tabelas do domínio. As migrations revogam acesso de `anon` e `authenticated`; o app usa `service_role` exclusivamente no servidor.
3. Nunca confiar em `barber_id`, `service_id`, `staff_member_id` ou valores de plano enviados pelo cliente. Revalidar pertencimento, atividade e capacidade no servidor/banco.
4. Regras de concorrência e integridade devem existir no PostgreSQL/RPC/constraint, não apenas no frontend.
5. Integrações externas são best-effort e devem ter timeout, tratamento de erro e estado persistido quando o fluxo exigir auditoria.
6. Não expor segredos em código client, respostas HTTP, logs ou variáveis `NEXT_PUBLIC_`.

## 5. Autenticação e sessão

### Estado atual

Existe uma transição de Supabase Auth para autenticação própria local:

- Novas contas usam `public.users`, senha com Argon2id via `@node-rs/argon2` e sessão em `public.sessions`.
- O cookie `agendbarber_session` é `httpOnly`, `sameSite=lax`, `secure` em produção, com duração de 30 dias.
- Apenas o hash SHA-256 do token fica no banco; o token puro fica no cookie.
- Sessões carregam expiração, revogação, IP e user-agent.
- Contas antigas podem autenticar via Supabase Auth e são migradas no primeiro login bem-sucedido.
- `getCurrentUser()` prioriza sessão local e usa Supabase Auth como fallback temporário.

### Regras

- Toda rota protegida deve chamar `getCurrentUser()` antes de acessar dados da conta.
- Após obter o usuário, resolver a barbearia por `.eq('user_id', user.id)` e usar o `barber.id` resolvido; nunca aceitar uma relação de conta vinda do frontend.
- Login, cadastro, logout, reset e endpoints mutáveis devem validar origem/Fetch Metadata quando implementado e aplicar rate limit.
- Recuperação de senha deve responder de forma genérica para não revelar se um e-mail existe.
- Tokens de reset são armazenados como hash, expiram e são de uso único.
- Não criar uma segunda estratégia de sessão sem documentar migração, invalidação e compatibilidade.

## 6. Modelo de domínio e banco

### Entidades principais

- `users`: identidade local, e-mail, hash de senha, status e origem da autenticação.
- `sessions`: sessões locais revogáveis e expiradas.
- `password_reset_tokens`: tokens de recuperação.
- `barbers`: conta/barbearia, dono, slug, contato, logo, PIX e estado de trial.
- `staff_members`: profissionais ativos/inativos; exatamente um owner por barbearia; owner criado por trigger.
- `services`: serviços, duração, preço, imagem e atividade.
- `availability_rules`: uma regra por dia da semana, intervalo e horário ativo.
- `blocked_times`: bloqueio de dia inteiro (`blocked_time = null`) ou horário específico.
- `appointments`: reserva, profissional, cliente, serviço, status e pagamento do serviço.
- `clients`: cadastro persistente de clientes por barbearia, indexado por WhatsApp, associado opcionalmente aos agendamentos.
- `whatsapp_logs`: auditoria de mensagens enviadas/falhas.
- `subscriptions`: plano, limite de equipe, estado, período e identificadores Asaas.
- `billing_checkouts`: intenção/checkout externo e seu estado.
- `payments`: pagamentos Asaas normalizados por `provider_payment_id`.
- `billing_events`: eventos recebidos, deduplicados e processados/ignorados/falhos.
- `billing_coupons` e `billing_coupon_redemptions`: cupons, limites e reserva concorrente.
- `financial_goals`: meta mensal única por barbearia.
- `push_subscriptions`: endpoints Web Push por barbearia.
- `appointment_calendar_tokens`: token público temporário; somente o hash é persistido.
- `api_rate_limits`: contador compartilhado de janela por chave.

### Integridade e triggers relevantes

- RLS habilitado e grants públicos revogados nas tabelas de domínio.
- `agendbarber_set_updated_at` mantém timestamps de atualização.
- Trigger cria o profissional owner ao inserir uma barbearia e sincronização do perfil atualiza seu nome/WhatsApp.
- Trigger `agendbarber_enforce_staff_limit` impede exceder o limite do plano usando lock advisory.
- Trigger `agendbarber_validate_plan_capacity` impede reduzir plano abaixo da equipe ativa.
- Funções de billing e agendamento são `security definer`, fixam `search_path = public` e têm `execute` concedido somente a `service_role`.
- Índices existem para agenda por barbearia/data/status, bloqueios, equipe, sessões, billing e push.
- Clientes são isolados por `barber_id`; o telefone normalizado é único dentro da barbearia. O nome/WhatsApp continuam duplicados no agendamento para preservar o retrato histórico mesmo que o cadastro do cliente seja alterado depois.

### Migrations

Aplicar em ordem lexicográfica/data, sem editar uma migration já aplicada em ambiente compartilhado. A sequência atual inclui:

1. `202607220001_production_hardening.sql`: RLS, rate limit e reserva transacional inicial.
2. `202608010001_auth_billing_foundation.sql`: auth local, sessões, billing e eventos.
3. `202608010002_local_auth_cutover.sql`: cadastro/reset e corte da FK para `users`.
4. `202608010003_billing_checkout_integrity.sql`: um checkout aberto por barbearia.
5. `202608020001_billing_webhook_access.sql`: claim/retry seguro de eventos.
6. `202608030001_plans_staff_booking.sql`: planos, equipe, owner e reserva por profissional.
7. `202608030002_plan_price_defaults.sql`: ajuste intermediário de preço.
8. `202608050001_pix_payment_flow.sql`: PIX do serviço e confirmação manual.
9. `202608060001_financial_goals.sql`: metas mensais.
10. `202608060002_trials_and_coupons.sql`: trial de 7 dias e cupons.
11. `202608120001_plan_prices_and_push.sql`: preços atuais e Web Push.
12. 202608200001_client_calendar_links.sql: links públicos de calendário.
13. 202610200001_blocked_times_batch.sql: RPC transacional e idempotente para bloqueio de vários horários específicos.

Testes SQL e rollbacks existem para as migrations de foundation/cutover/integridade/webhook/equipe. Rollbacks são potencialmente destrutivos e só devem ser usados com aprovação explícita e sem dados reais dependentes.

## 7. Fluxos de negócio

### 7.1 Cadastro e onboarding

1. Cliente gestor envia cadastro para `/api/register`.
2. Route Handler valida Zod, origem, rate limit, e-mail e slug.
3. Conta local é criada por RPC/função transacional; a barbearia e o trial são preparados pelo banco.
4. Sessão é criada e o usuário é direcionado para assinatura/onboarding.
5. Perfil, owner, serviços e disponibilidade são configurados antes de compartilhar o slug.

### 7.2 Agenda pública

1. `/api/public/barbers/[slug]` valida slug, verifica acesso de billing e devolve somente dados públicos ativos.
2. Cliente seleciona profissional/serviço/data.
3. `/api/available-slots` calcula slots com regra de disponibilidade, duração do serviço, bloqueios, reservas confirmadas e horário de São Paulo.
4. O POST `/api/appointments` repete todas as validações server-side, aplica rate limit, verifica billing e chama `create_public_appointment`.
5. A RPC usa lock advisory por profissional/data, valida serviço, profissional, expediente, passado, bloqueios e sobreposição antes do insert.
6. Um token de calendário é gerado, apenas seu hash é salvo e o token puro retorna uma única vez.
7. Push é disparado com `after()` sem bloquear a resposta principal.

O cálculo de slots é apenas prévia de disponibilidade. A confirmação definitiva é a RPC transacional; colisão deve retornar `409`.

### 7.3 Agendamento manual

Usuário autenticado usa `/api/appointments/manual`; o endpoint resolve a própria barbearia, reutiliza a mesma RPC de reserva e força pagamento `at_barbershop`. Isso mantém a mesma proteção contra conflito do fluxo público.

O diálogo manual também pesquisa `/api/clients` por nome ou WhatsApp. Selecionar um cliente preenche os campos, mas os campos continuam editáveis antes da confirmação. Após um agendamento público ou manual, o servidor sincroniza o cliente e associa o agendamento por `client_id` sem remover os campos históricos do agendamento.

### 7.4 Gestão da agenda

- GET `/api/appointments` filtra por data/período/status e inclui serviço/profissional.
- PATCH `/api/appointments/[id]` permite `confirmed`, `cancelled`, `completed` e/ou pagamento `paid`/`pending_confirmation`, sempre limitado ao `barber_id` do usuário.
- Confirmação de pagamento é manual para PIX/pagamento presencial.
- Cancelar não remove histórico; muda status.

### 7.5 Billing

Planos codificados em `src/lib/billing/plans.ts` são a fonte do catálogo da aplicação:

- `solo`: Essencial, R$ 19,90, 1 profissional.
- `team`: Equipe, R$ 49,90, 3 profissionais.
- `studio`: Barbearia, R$ 79,90, 6 profissionais.

`getBillingAccess...` permite acesso por assinatura ativa, trial vigente, grace period ou override manual. Sem acesso, a agenda pública e a criação de agendamentos retornam `402`.

O checkout:

1. valida usuário, plano, limite de equipe, configuração e rate limit;
2. expira checkouts locais vencidos;
3. mantém/reutiliza um checkout compatível ou cancela o anterior;
4. cria/atualiza intenção local e reserva cupom transacionalmente;
5. chama Asaas com preço da primeira cobrança;
6. persiste o checkout como ativo;
7. deixa a ativação real para o webhook.

O retorno visual do checkout nunca é prova de pagamento. O webhook autenticado do Asaas é a fonte de verdade, com idempotência por evento, ordenação por `dateCreated`, claim/retry e upsert de pagamentos por identificador externo. Quando houver cupom, a primeira cobrança pode ter desconto, mas a recorrência deve ser restaurada ao preço integral.

### 7.6 Integrações assíncronas

- WhatsApp: envia confirmação ao cliente e aviso ao barbeiro, registra `whatsapp_logs`; falha não deve desfazer a reserva.
- Web Push: envia para endpoints ativos, marca sucesso/falha e desativa endpoints HTTP 404/410.
- Resend: envia reset com `Idempotency-Key`.
- Asaas: chamadas server-side com timeout de 15s, chave secreta e normalização de URL.

## 8. Catálogo de API

Todos os endpoints retornam JSON com `{ error }` em falhas; usar códigos HTTP semânticos e não vazar mensagens internas em produção.

| Endpoint | Métodos | Proteção/finalidade |
|---|---|---|
| `/api/auth/login` | POST | origem + rate limit + login local/legacy |
| `/api/auth/logout` | POST | origem + revoga sessão |
| `/api/auth/session` | GET | sessão atual |
| `/api/auth/forgot-password` | POST | origem + rate limit + reset genérico |
| `/api/auth/reset-password` | POST | origem + rate limit + token único |
| `/api/register` | POST | origem + rate limit + cadastro |
| `/api/profile` | GET, PUT | usuário; perfil/barbearia |
| `/api/services`, `/api/services/[id]` | GET, POST, PUT, DELETE | usuário; CRUD de serviço |
| `/api/availability` | GET, POST, PUT, DELETE | usuário; regras semanais |
| `/api/blocked-times` | GET, POST, DELETE | usuário; bloqueios |
| `/api/staff` | GET, POST, PUT, DELETE | usuário; equipe e limite do plano |
| `/api/clients` | GET, POST | usuário; busca e upsert de clientes da própria barbearia |
| `/api/appointments` | GET, POST | GET protegido; POST público com billing/rate limit |
| `/api/appointments/manual` | POST | usuário; reserva interna |
| `/api/appointments/[id]` | PATCH | usuário; status/pagamento |
| `/api/public/barbers/[slug]` | GET | público; catálogo ativo |
| `/api/available-slots` | GET | público; prévia de slots |
| `/api/calendar/[token]` | GET | token público; evento de calendário |
| `/api/billing/checkout` | POST | usuário; checkout/troca de plano |
| `/api/billing/coupon` | POST | usuário; pré-validação de cupom |
| `/api/billing/reconcile` | POST | usuário; reprocessamento de eventos ignorados |
| `/api/webhooks/asaas` | POST | token do webhook; fonte de verdade financeira |
| `/api/push/subscription` | POST, DELETE | usuário; endpoints Web Push |
| `/api/whatsapp` | POST | usuário; envio manual |
| `/api/service-images` | conforme código atual | usuário; upload/gestão de imagem |
| `/api/financial-goal` | conforme código atual | usuário; meta financeira |
| `/api/demo-login`, `/api/demo-logout` | POST | modo demo isolado |

Ao adicionar endpoint, documentar aqui: método, auth, payload, resposta, estados, rate limit, side effects e migration necessária.

## 9. Datas, disponibilidade e pagamentos

- Fuso oficial da agenda: `America/Sao_Paulo`.
- Datas de calendário devem ser strings `YYYY-MM-DD`; horários `HH:mm`/`HH:mm:ss` conforme a camada.
- Não usar `new Date('YYYY-MM-DD')` para regra de negócio sem controlar o fuso.
- A disponibilidade considera `day_of_week` PostgreSQL (`0=domingo`), início/fim, intervalo e duração do serviço.
- Intervalos são sobrepostos quando `novo_inicio < existente_fim && novo_fim > existente_inicio`.
- Bloqueio com horário nulo bloqueia o dia; bloqueio com horário preenchido bloqueia aquele início.
- Status de appointment: `confirmed`, `cancelled`, `completed`.
- Pagamento do serviço: método `pix` ou `at_barbershop`; status `pending_confirmation` ou `paid`.
- Preços monetários devem ser tratados como número validado na borda e persistidos em colunas numéricas; evitar cálculos de dinheiro em floating point sem arredondamento explícito.

## 10. Segurança e privacidade

- `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `VAPID_PRIVATE_KEY`, `RESEND_API_KEY` e credenciais Evolution são server-only.
- Headers globais: `nosniff`, `strict-origin-when-cross-origin`, `Permissions-Policy` restritiva e `X-Frame-Options: DENY`.
- Requisições mutáveis devem rejeitar origem cross-site e usar `isTrustedMutationRequest` quando aplicável.
- Rate limit compartilhado em PostgreSQL usa lock advisory; não substituir por memória do processo em Vercel.
- As APIs passam pelo `src/proxy.ts`: HTTPS obrigatório em produção, CORS restrito à origem oficial, `x-api-key` para integrações externas e rate limit global por IP/método/rota. `APP_API_KEY` é server-side e nunca deve ser `NEXT_PUBLIC_*`.
- Todas as rotas `/api` passam pelo `src/proxy.ts`: em produção exigem HTTPS, origem oficial ou `x-api-key`, CORS com allowlist explícita e rate limit global por IP/método/rota. `APP_API_KEY` é server-side; o proxy pode injetá-la internamente para o frontend oficial, mas ela nunca deve ser colocada em `NEXT_PUBLIC_*`.
- Mensagens de erro para cliente devem ser estáveis e úteis; logs podem conter detalhes técnicos, mas nunca segredos/token puro.
- Normalizar telefone antes de enviar WhatsApp; não confiar em telefone de entrada para autorização.
- Consultas sempre devem restringir por `barber_id` e, quando aplicável, `is_active`.
- Tokens públicos são de alta entropia, com hash no banco, expiração quando aplicável e resposta mínima.
- Uploads e URLs de imagem devem validar tipo/origem/tamanho conforme o endpoint; `next.config.mjs` só permite imagens remotas de hosts explicitamente configurados.

## 11. UI/UX e acessibilidade

- Preservar tema escuro, alto contraste, amarelo `#F5C400`/`#F4B400`, superfícies quase pretas e tipografia Inter.
- Reutilizar classes/componentes `premium-*`, `dashboard-*`, `gold-action`, `Button`, `Dialog`, `Toast` etc. antes de criar variantes.
- Estados obrigatórios: loading/skeleton, vazio, erro recuperável, sucesso, disabled e conflito.
- Toda ação destrutiva deve usar `ConfirmDialog` ou equivalente.
- Botões devem ser elementos `button`, links devem ser links; incluir labels/aria-label quando o ícone for a única indicação.
- Fluxos públicos devem funcionar sem conta e em viewport estreita; área protegida deve preservar navegação mobile.
- Formatação de moeda/data/hora deve usar os helpers existentes em `src/lib/utils/format.ts`.

## 12. Observações e riscos registrados

Estes pontos foram observados durante a auditoria e devem ser considerados antes de novas features:

1. Há histórico de migrations de preço intermediárias; preço, limite e código precisam permanecer alinhados entre `plans.ts`, migrations, checkout e webhook.
2. O sistema usa `service_role` em praticamente todas as rotas. Isso é intencional por causa do RLS fechado, mas aumenta a exigência de revisão de autorização por `user_id`/`barber_id` em cada endpoint.
3. O cálculo de slots e a criação final são camadas diferentes; qualquer feature de disponibilidade deve atualizar ambas e a RPC.
4. `available-slots` não substitui a transação final e pode ficar desatualizado entre leitura e reserva.
5. O disparo de push/WhatsApp é posterior à reserva; falhas de notificação não significam falha do agendamento e devem ser auditadas.
6. O cliente público recebe dados da barbearia e catálogo ativos; nunca adicionar ali e-mail, tokens, dados de billing sensíveis ou campos administrativos sem necessidade.
7. A compatibilidade com Supabase Auth é temporária. Alterações em auth devem preservar contas legadas até a migração estar comprovadamente concluída.
8. Foram encontrados textos com sinais de codificação corrompida em algumas strings exibidas nos dumps (`Ã`, `â`). Ao tocar nesses arquivos, preservar UTF-8 e corrigir somente com teste visual/regressão.
9. Não há suíte automatizada ampla de testes TypeScript/React configurada no `package.json`; migrations SQL possuem testes pontuais. Toda feature crítica deve incluir ao menos validação manual documentada e, quando afetar banco, teste SQL/migration.
10. `demo-*` usa cookies/localStorage e dados fixos; não misturar dados demo com dados reais nem permitir que o modo demo acesse integrações reais.
11. A base de clientes foi adicionada por `202608270001_clients.sql`; a migration faz backfill deduplicado dos agendamentos existentes e deve ser aplicada antes de usar a busca de clientes.
12. CORS não é mecanismo de autenticação: clientes não-browser precisam de `x-api-key`, e usuários do browser continuam dependendo de sessão, autorização por barbearia e validação de origem/CSRF.
13. A estrutura legada `clients/client_id` foi validada contra `customers/customer_id` e sua remoção deve ocorrer somente pela migration destrutiva `202608270002_remove_legacy_clients.sql`.
14. A busca rápida de clientes usa `GET /api/customers?mode=lookup`, com payload mínimo, busca por nome/telefone e limite de resultados; a listagem completa continua reservada à tela de Clientes. O diálogo usa mínimo de 2 caracteres, debounce de 180 ms, cancelamento de requisições obsoletas, cache por termo e cache local de 30 segundos para evitar consultas repetidas ao reabrir.
15. A migration `202608270003_customer_search_indexes.sql` habilita `pg_trgm` e cria índices GIN para `customers.name` e `customers.whatsapp`, permitindo buscas `ILIKE` com volume maior sem carregar a lista completa no cliente.

## 13. Procedimento obrigatório para novas features e bugs

Antes de implementar:

1. Identificar o fluxo afetado, ator (público/gestor/webhook), entidade e fonte de verdade.
2. Verificar se há migration, constraint, trigger ou RPC envolvida.
3. Definir contrato de entrada/saída e atualizar/criar schema Zod.
4. Definir autorização, rate limit, efeitos externos, idempotência e tratamento de erro.
5. Mapear alterações necessárias em página, componente, API, biblioteca e banco.

Durante a implementação:

1. Reutilizar tipos, validators, helpers e componentes existentes.
2. Manter regras críticas no servidor e no banco.
3. Criar nova migration versionada para mudanças persistentes; nunca reescrever migration aplicada.
4. Manter respostas compatíveis ou documentar explicitamente a quebra.
5. Atualizar este arquivo na mesma alteração, descrevendo toda mudança de arquitetura, fluxo, contrato, regra ou configuração.

Depois da implementação:

1. Rodar `npm run typecheck`, `npm run lint` e `npm run build` quando aplicável.
2. Testar autenticação, autorização entre barbearias, estados vazios/erro/loading e o fluxo principal ponta a ponta.
3. Para agenda, testar passado, fora do expediente, bloqueio, duração, conflito concorrente e cancelamento.
4. Para billing, testar checkout duplicado, retorno sem webhook, webhook duplicado/fora de ordem, pagamento recusado, trial, cupom e troca de plano.
5. Para integrações, testar configuração ausente, timeout, erro externo e registro de falha.
6. Registrar aqui arquivos alterados, migration aplicada, variáveis novas e pendências conhecidas.

### 13.1 Versionamento e entrega

- Quando o solicitante pedir para fazer um `commit`, a entrega padrão inclui: revisar o diff, executar `git add`, criar o commit e executar `git push` para o upstream da branch atual.
- Se o push falhar por autenticação, conflito, ausência de upstream ou bloqueio externo, informar o erro exato e não considerar a entrega concluída até receber orientação ou resolver o problema.
- Mensagens de commit devem seguir Conventional Commits, em português ou inglês conforme o contexto: `tipo(escopo opcional): descrição curta`.
- Tipos preferenciais: `feat` para funcionalidade, `fix` para correção, `perf` para desempenho, `security` para segurança, `refactor` para reorganização, `docs` para documentação, `test` para testes, `chore` para manutenção e `build` para configuração/build.
- A descrição deve ser objetiva, no infinitivo ou em forma verbal consistente, sem ponto final. Exemplos: `feat(customers): permite selecionar cliente no agendamento` e `fix(appointments): evita conflito ao remarcar horário`.
- O nome da branch e o upstream devem ser verificados antes do push; nunca fazer push forçado sem autorização explícita.

## 14. Registro desta auditoria

### Alterações realizadas nesta tarefa

- Criado/preenchido `spec/constitution.md`.
- Implementada a base de clientes em `supabase/migrations/202608270001_clients.sql`, incluindo backfill, índice único por telefone e `appointments.client_id`.
- Adicionados `Client`, schema Zod, `/api/clients`, sincronização pós-agendamento e busca/autopreenchimento no agendamento manual.
- A sincronização é best-effort nesta primeira etapa: uma falha de cadastro do cliente é registrada no log sem desfazer o agendamento já confirmado.
- Endurecida a borda das APIs com `APP_API_KEY`, HTTPS obrigatório em produção, CORS por origem oficial e rate limit global no proxy.
- Preparada a migration destrutiva `202608270002_remove_legacy_clients.sql`; ela aborta se encontrar associações órfãs ou agendamentos ainda não migrados para `customers`.
- Otimizado o lookup de clientes no agendamento manual e restaurada a proteção central de APIs sobre a branch atual de produção.
- A otimização do lookup foi concluída ponta a ponta: índices trigram no banco, resposta enxuta limitada, debounce, cache por termo, busca local e abortamento de requisições no frontend.
- Documentada a variável `APP_API_KEY` no README e na constituição para integrações externas protegidas.
- O documento foi derivado da estrutura `src/app`, `src/components`, `src/lib`, `src/types`, `supabase/migrations`, `supabase/tests`, `supabase/rollbacks`, `README.md`, `package.json` e configurações Next/Tailwind/TypeScript/ESLint.

### Regra de manutenção deste documento

Qualquer mudança futura que altere arquitetura, stack, fluxo, entidade, endpoint, regra de segurança, variável de ambiente, migration, estado, integração ou convenção deve adicionar uma nota nesta constituição no mesmo commit.

## 15. Features de setembro de 2026

### 15.1 Congelamento de uma data específica

- A análise incluiu consulta somente de leitura ao Supabase configurado, confirmando `blocked_times` com `barber_id`, `blocked_date`, `blocked_time` e `reason`. A estrutura existente atende: horário nulo representa bloqueio integral da data, para todos os profissionais da barbearia. Nenhuma coluna, migration ou variável nova é necessária.
- `FreezeDayControl` permite congelar/liberar a data selecionada em `/agendamentos` e escolher uma data em `/horarios`, com confirmação, estado de consulta, erro recuperável e indicação do dia congelado. O controle fica desabilitado no modo demo.
- Congelar impede novas reservas; não cancela nem modifica agendamentos existentes e não muda as regras semanais. Liberar remove todos os bloqueios integrais da própria barbearia/data, mantendo os de horários específicos. A disponibilidade volta a seguir expediente, reservas e demais bloqueios.
- `/api/blocked-times`: GET aceita `?date=YYYY-MM-DD` e responde `{ blocked: [] }` sem cache; POST aceita `{ blocked_date, blocked_time?: HH:mm | null | '', reason?: string | null }`, responde `{ blocked }` com 201 ao inserir ou 200 ao encontrar um bloqueio integral existente; DELETE aceita exclusivamente `?id=uuid` ou `?date=YYYY-MM-DD`, responde `{ success: true }`. Todos exigem sessão e isolamento por barbearia; mutações validam origem. Rate limit e billing continuam pelo proxy. Datas inválidas/passadas (no POST) retornam 400; origem inválida 403; falha de persistência 500 com mensagem genérica. Não há efeitos externos.
- A prévia `/api/available-slots` e a RPC `create_public_appointment`, compartilhada pelos fluxos público e manual, já verificam bloqueios integrais. A RPC continua sendo a confirmação definitiva; `BLOCKED_TIME` retorna 409 nos endpoints de reserva. A inserção do bloqueio não cancela reservas que terminarem de ser confirmadas simultaneamente à ação.
- Arquivos: `src/components/schedule/FreezeDayControl.tsx`, páginas de horários/agendamentos, API de bloqueios e validator de disponibilidade. Verificação: `npm run typecheck` e `node scripts/test-features.mjs` passaram (datas reais, valores nulos, autenticação, origem, isolamento, reutilização de bloqueio e liberação seletiva). Os testes de API usam banco simulado; não foram criadas reservas de teste no banco real. Validação visual e ponta a ponta com conta de teste permanece necessária antes da publicação.

### 15.2 Visita especial do desenvolvedor

- O helper `src/lib/appointments/special.ts` exige a combinação de nome `Hélio Nunes` e telefone `77988197912`. Normaliza acentos, caixa, espaços e pontuação do telefone, aceitando o prefixo brasileiro `55` quando o número completo tem 13 dígitos. Nome ou telefone isoladamente não ativa o destaque. É identificação visual a partir dos dados informados no agendamento público/manual, sem concessão de permissões ou alteração de billing/disponibilidade.
- Cards da agenda, lista do sino e próximo atendimento têm selo de desenvolvedor e fundo dourado. O dashboard também exibe os agendamentos especiais confirmados no horizonte já consultado de sete dias. A animação de entrada/brilho é limitada e respeita `prefers-reduced-motion`; cancelados/concluídos preservam status e identificação, sem animação ativa.
- `SpecialAppointmentAlerts` nas páginas de dashboard e agenda exibe toast para novas visitas especiais recebidas após a montagem da página, deduplicadas por ID e barbearia em `sessionStorage` (fallback em memória). Mudar filtros ou revisitar um agendamento antigo não deve disparar som. A detecção acompanha os dados já consultados: sete dias no dashboard e data/semana/filtro na agenda. Não há polling adicional nem endpoint novo.
- Som sintetizado com Web Audio, preparado internamente após uma interação comum (toque/clique ou teclado), sem botão, texto de configuração ou amostra sonora. Se já houver interação anterior reconhecida pelo navegador, a preparação é tentada ao montar o componente. O contexto permanece no runtime durante a navegação; ao recarregar, aplica-se novamente a política de reprodução do navegador. Não há áudio automático de histórico, arquivos externos ou variáveis novas. Falta de suporte ou bloqueio de áudio é tratada silenciosamente e não impede o fluxo visual da agenda.
- Web Push do agendamento público usa título especial quando nome e telefone correspondem; o som do sistema operacional permanece sob controle do navegador/dispositivo, sem áudio personalizado no service worker.
- Arquivos: helpers em `src/lib/appointments`, `SpecialAppointmentBadge`, `SpecialAppointmentAlerts`, `AppointmentCard`, `NotificationBell`, páginas de agenda/dashboard, `src/lib/push/send.ts` e `globals.css`. Nenhuma migration necessária. Testes `node scripts/test-features.mjs` cobrem combinação/normalização e preparação silenciosa do áudio com Web Audio simulado. Validação visual, áudio em dispositivo e envio de push real devem ser feitos com conta de teste antes da publicação.

### 15.3 Foto opcional nos serviços

- A coluna `services.image_url` já é opcional no schema exposto pelo Supabase, confirmado em consulta somente de leitura. Não há migration ou variável nova.
- O schema Zod compartilhado agora aceita explicitamente `null`, além de omissão/string vazia, normalizando ausência para `null`. Corrige o cadastro/edição: a página enviava `null` quando não havia foto, mas a API rejeitava esse valor. URLs preenchidas continuam sendo validadas.
- `ServiceForm` indica que a foto é opcional, permite criar sem upload e remover uma foto existente na edição. Remover limpa o campo e salva `image_url: null`; não apaga o arquivo do storage, preservando referências existentes. Previews locais têm object URLs revogadas. Cards administrativos e seleção pública reutilizam seus placeholders existentes.
- Arquivos: `src/lib/validations/service.ts`, `src/components/services/ServiceForm.tsx` e `scripts/test-features.mjs`. Testes de schema e APIs simuladas passaram para ausência/null/string vazia, criação sem foto, remoção na edição e isolamento por barbearia. `npm run typecheck` passou. Validação visual/ponta a ponta com conta de teste permanece necessária antes da publicação.

### 15.4 Verificação final e roteiro antes da publicação

- Verificações executadas com sucesso: `npm run typecheck`, `npm run lint` (sem warnings), `npm run build` e `node scripts/test-features.mjs`. O script também verifica a prévia sem slots em um dia congelado, a preservação de um bloqueio específico ao liberar e o retorno 409 de `BLOCKED_TIME` nos endpoints público/manual, usando fixtures e RPC simuladas.
- Roteiro manual pendente: em uma conta de teste, congelar uma data com reserva existente, verificar ausência de horários para todos os profissionais no link público e no cadastro manual, liberar e confirmar os bloqueios específicos; verificar os cards de Hélio Nunes com ambos os indicadores, movimento reduzido, preparação interna do áudio após interação sem controle/amostra visível e ausência de repetição ao mudar filtros; criar serviço sem foto, editar/remover uma foto e conferir os placeholders no link público.
- Não foram alterados dados reais, aplicadas migrations ou criadas novas variáveis de ambiente. A revisão também removeu uma variável sem uso no dashboard e sincroniza o controle de congelamento com mudanças na lista de bloqueios da tela de horários.

### 15.5 Correção do login local com URL pública de produção

- Reproduzido `POST http://localhost:3000/api/auth/login` com retorno 401 `{ error: 'API key ou origem oficial obrigatoria.' }`, antes da validação de credenciais, pois `NEXT_PUBLIC_APP_URL` apontava ao domínio de produção.
- `isOfficialOrigin` agora aceita a origem exata do próprio servidor (protocolo, host e porta) quando `NODE_ENV === 'development'`. Assim, `npm run dev` funciona com localhost/127.0.0.1 mesmo que a URL pública no `.env` continue apontando à produção. Origens/portas diferentes continuam rejeitadas; produção preserva a allowlist configurada. Sessão, validação de credenciais, proteção de mutações, billing e rate limit continuam obrigatórios conforme seus fluxos.
- Arquivos: `src/lib/security/request.ts`, `scripts/test-features.mjs` e esta constituição. Sem migrations ou novas variáveis de ambiente. A regressão verifica localhost, loopback, porta/origem incorreta e allowlist em produção.
- Verificação local após a correção: POST com origem `http://localhost:3000` e body vazio chegou ao handler de login e retornou 400 por dados inválidos, em vez do 401 do proxy. POST com origem externa continuou retornando 401. Não foram usadas credenciais reais nem alteradas contas. `node scripts/test-features.mjs`, `npm run typecheck` e `npm run lint` passaram.

### 15.6 Ativação interna do som especial

- Por solicitação do desenvolvedor, removidos os textos e controles de ativar/desativar som em agenda e dashboard. `SpecialAppointmentAlerts` agora retorna `null` e prepara Web Audio silenciosamente em interações normais de ponteiro/teclado; os listeners são removidos ao desmontar. Não há amostra sonora ou toast de configuração/falha de áudio.
- O som é reproduzido internamente apenas para novas visitas especiais detectadas com contexto de áudio já liberado pelo navegador. Eventos recebidos com áudio bloqueado não ficam enfileirados para reprodução posterior. Suporte ausente/bloqueio não afeta os cards nem o toast da visita. O aviso não pode ultrapassar as políticas de autoplay do navegador.
- Arquivos: `src/components/dashboard/SpecialAppointmentAlerts.tsx`, `src/lib/appointments/special-sound.ts`, `scripts/test-features.mjs` e esta constituição. Sem alterações no banco, migrations ou variáveis novas. A seção 15.2 e o roteiro manual foram atualizados para descrever o comportamento atual.
- Verificações: `node scripts/test-features.mjs`, `npm run typecheck` e `npm run lint` passaram. Os testes de áudio usam contexto simulado e confirmam preparação sem amostra e fallback silencioso para navegador sem suporte; reprodução em dispositivo real permanece no roteiro manual.
### 15.7 Bloqueio de um ou vários horários específicos

- A auditoria confirmou que `blocked_times` já representa bloqueios específicos por `barber_id`, `blocked_date` e `blocked_time`; não foi necessária coluna nova. O bloqueio continua valendo para todos os profissionais da barbearia e não cancela nem altera reservas existentes.
- `BlockTimeForm` foi redesenhado para seleção múltipla: data, grade baseada no expediente semanal ativo, exclusão do intervalo de almoço e horários passados no dia atual, chips removíveis, horário personalizado, contador e motivo opcional. Datas congeladas orientam o gestor a liberar o dia primeiro. O limite é de 48 horários por operação.
- Há acesso em `/horarios` e diretamente na data selecionada em `/agendamentos`. A listagem de `/horarios` agrupa bloqueios por data, diferencia dia inteiro de horários e permite liberar cada item com confirmação. Após congelar, liberar, bloquear ou remover, os controles recarregam o estado do servidor.
- No mesmo seletor usado para bloquear, horários persistidos aparecem em vermelho com um `X`. Um toque abre a confirmação de desbloqueio e, após sucesso, atualiza a grade sem fechar o fluxo. Bloqueios personalizados fora da grade semanal aparecem em uma seção própria e seguem a mesma confirmação. Seleções ainda não salvas permanecem amarelas e o `X` apenas retira o item da seleção.
- POST `/api/blocked-times` mantém o contrato anterior de bloqueio integral e passa a aceitar `{ blocked_date: YYYY-MM-DD, blocked_times: HH:mm[1..48], reason?: string | null }`. O schema remove duplicatas e ordena os horários. Responde `{ blocked: BlockedTime[] }` com 201; data/horário passado ou payload inválido retorna 400; sessão, origem, billing/rate limit do proxy e isolamento por barbearia continuam obrigatórios. Não há efeitos externos.
- A migration `202610200001_blocked_times_batch.sql` cria `block_barber_times(uuid, date, time[], text)`, restrita a `service_role`. A RPC usa advisory lock por barbearia/data, rejeita passado e insere apenas horários ausentes, retornando o estado final ordenado. O fallback compatível da API mantém o recurso funcional antes da aplicação da RPC, embora sem a atomicidade concorrente da função. O rollback correspondente remove somente a função.
- A prévia pública e as reservas pública/manual já consultam `blocked_times`; horários específicos deixam de aparecer e a RPC final de agendamento retorna `BLOCKED_TIME`/409 em corrida. O comportamento existente de bloqueio exato pelo horário inicial foi preservado.
- Arquivos: `BlockTimeForm`, páginas de horários/agendamentos, validator e API de bloqueios, migration/rollback e `scripts/test-features.mjs`. Testes cobrem schema em lote, deduplicação/ordenação, autorização, horário passado, chamada isolada por barbearia, prévia de slots e rejeição pública/manual. Antes da publicação, aplicar a migration em ordem e validar visualmente seleção múltipla, horário personalizado, remoção e toda a equipe com uma conta de teste.
