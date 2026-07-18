# StudioHub AI — PRD

## Problema / Visão
Plataforma SaaS premium para fotógrafos (React + FastAPI + MongoDB). Gestão completa: CRM, Sessões, Galerias, Contratos, Orçamentos, Financeiro, IA e Área do Cliente. Design minimalista/elegante, responsivo, dark/light, animações suaves. App em Português (PT/BR via i18n).

## Arquitetura
- `/app/backend/server.py`: FastAPI, MongoDB (motor async), rotas prefixadas `/api`.
- `/app/frontend`: React (CRA + Craco), Tailwind, Shadcn UI, `src/lib/api.js`, i18n em `src/lib/settings.jsx` e `src/lib/format.js`.
- Rota do módulo financeiro: `/financeiro` (App.js).

## Implementado
- MVP + Fase 1–7: Dashboard/CRM, Orçamentos, Contratos (assinatura digital), Assistente IA (Emergent LLM key), Galerias Premium, i18n PT/BR, Área do Cliente (JWT), melhorias de Galerias.
- **Fase 8 — Dashboard Financeiro** (2026): 5 KPIs (Receita do mês, Contas a receber, Contas a pagar, Lucro, Fluxo de caixa) + 2 gráficos (Receita mensal barras, Despesas por categoria donut). Endpoint `GET /api/finance/summary`.
- **Módulo Contas a Receber** (2026): CRUD + pagamento parcial + marcar pago; lista com cliente, sessão/projeto, total, recebido, saldo, vencimento, método, estado (Pendente/Parcial/Pago/Vencido); pesquisa, filtros, ordenação por vencimento. Integrado no KPI "Contas a receber". Rotas: `GET/POST /api/receivables`, `PUT /api/receivables/{id}`, `POST /api/receivables/{id}/payment`, `POST /api/receivables/{id}/pay`, `DELETE /api/receivables/{id}`. Testado (iteration_8.json) — sem regressões.

## Backlog priorizado
- P1: Loja Online (checkout com Stripe) — próximo após validação do utilizador.
- P1: Admin Panel (gestão de utilizadores/planos/subscrições).
- P2: Automações (Email/WhatsApp/SMS, lembretes); Marketing (landing pages, blog, SEO, newsletter); Website Builder (portfólio).
- P3: QR Codes e downloads por resolução nas galerias.
- Contas a Pagar (NÃO pedido ainda — não iniciar sem pedido).

## Dívida técnica / notas
- `GET /api/clients` vaza `password_hash=""` via `response_model=Client` (pré-existente, fora de escopo).
- Pagamentos/downloads ainda mockados até integração Stripe.

## Credenciais de teste
Ver `/app/memory/test_credentials.md`. App do fotógrafo sem auth; Portal cliente: ana.rui@email.pt / cliente123.
