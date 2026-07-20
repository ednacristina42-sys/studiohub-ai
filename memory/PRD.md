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
- **Módulo Contas a Pagar** (2026): CRUD + marcar pago; campos fornecedor, descrição, categoria (16), valor, vencimento, data pagamento, método, estado (Pendente/Pago/Vencido calculado/Cancelado), observações; pesquisa, filtro por estado, filtro por categoria, ordenação por vencimento; valores não-negativos. Rotas: `GET/POST /api/payables`, `GET /api/payables/categories`, `PUT /api/payables/{id}`, `POST /api/payables/{id}/pay`, `DELETE /api/payables/{id}`. Migração: coleção `expenses` substituída por `payables` como fonte única do KPI "Contas a pagar" (pendente+vencido) e do gráfico "Despesas por categoria" (pagas). PUT auto-preenche paid_date quando status→pago. Testado (iteration_9.json) — 136 passed, zero regressões.
- **Módulo Relatórios Financeiros** (2026): página `/financeiro/relatorios` (botão "Relatórios" em `/financeiro`). 6 análises: receita por mês, despesas por categoria, contas a receber por estado, contas a pagar por estado, fluxo de caixa (entradas/saídas/líquido) e top 10 clientes por faturação. Filtros: período (start/end), estado, categoria. Exportação PDF (reportlab) e Excel (openpyxl). Rotas: `GET /api/reports/financial`, `GET /api/reports/financial/export?format=xlsx|pdf`. Novas deps: openpyxl, reportlab. Testado (iteration_10.json) — 26/26 novos + 162 passed, zero regressões.
- **Módulo Loja Online — MVP** (2026): módulo independente em `/loja` (tabs Produtos/Categorias/Pedidos). Categorias: CRUD + pesquisa + ativo/inativo (`GET/POST/PUT /api/store/categories`, `PATCH /toggle`, `DELETE`). Produtos: CRUD + nome/descrição/categoria/preço/URL imagem/SKU/ativo + pesquisa + filtros (`GET /api/store/products` com ?category/?active, `POST/PUT/PATCH toggle/DELETE`; preço clampado ≥0). Pedidos: collection independente `store_orders` (isolada de `db.orders` da galeria) com estados Novo/Pago/Em Produção/Enviado/Entregue/Cancelado (`GET /api/store/orders`, `GET /states`, `POST`, `PUT`, `PATCH /status`, `DELETE`; número ENC-ANO-XXXX, total calculado). Carrinho: estrutura pronta (itens → pedido), SEM pagamentos/Stripe/uploads. Rota hardcoded antiga `/store/products` removida e unificada em `db.products`; galeria pública passa a usar `?active=true`. Frontend: Store.jsx + StoreProducts.jsx + StoreCategories.jsx + StoreOrders.jsx. Testado (iteration_12 e iteration_13.json) — 38/38 backend + frontend, zero regressões.
- **Loja Online — Fase 2** (2026): Galeria Pública (`/g/{access_token}`, ClientGallery.jsx) transformada em experiência de compra. Cada foto → "Adicionar produto" (grid-buy/lb-buy) abre modal (imagem, produto, quantidade, observações) → carrinho lateral (alterar qtd, remover, subtotal) → checkout (nome/email/telefone/notas, sem pagamento) → `POST /api/public/galleries/{token}/store-order` cria Pedido em `store_orders` com estado "Novo", nº ENC-ANO-XXXX, total calculado, fotos+produtos+telefone associados. Admin Loja→Pedidos: botão detalhe (view-order) mostra cliente, telefone, galeria, fotos compradas, produtos, observações e total. Backend: OrderItem +photo_name/photo_url/notes; Order/OrderCreate +customer_phone. Endpoint legacy `/order` (db.orders) preservado. Testado (iteration_14→15.json) — 19/19 backend + E2E, zero regressões.

## Backlog priorizado
- P1: Loja Online — Fase 3 (checkout real com Stripe) — aguarda validação do utilizador.
- P1: Admin Panel (gestão de utilizadores/planos/subscrições).
- P2: Automações (Email/WhatsApp/SMS, lembretes); Marketing (landing pages, blog, SEO, newsletter); Website Builder (portfólio).
- P3: QR Codes e downloads por resolução nas galerias.
- Contas a Pagar (NÃO pedido ainda — não iniciar sem pedido).

## Dívida técnica / notas
- `GET /api/clients` vaza `password_hash=""` via `response_model=Client` (pré-existente, fora de escopo).
- Pagamentos/downloads ainda mockados até integração Stripe.

## Credenciais de teste
Ver `/app/memory/test_credentials.md`. App do fotógrafo sem auth; Portal cliente: ana.rui@email.pt / cliente123.
