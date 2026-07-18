# StudioHub AI — PRD

## Problem Statement
Plataforma SaaS moderna e premium de gestão para fotógrafos ("StudioHub AI"). Design original, elegante, responsivo, rápido, modular. Estilo minimalista/premium, modo claro e escuro, animações suaves, componentes reutilizáveis, UI tipo SaaS. Idioma: Português (Portugal).

## User Choices
- Módulos: TODOS (Clientes/CRM, Projetos/Sessões, Galerias + entrega, Calendário, Financeiro)
- Autenticação: nenhuma (acesso aberto por agora)
- IA: seleção/organização inteligente de fotos
- Tema: escuro premium com dourado + claro minimalista com violeta (toggle)
- Pagamentos: não (apenas gestão/registo de faturas)

## Architecture
- Frontend: React 19 + Tailwind + shadcn/ui + framer-motion + recharts + next-themes + sonner
- Backend: FastAPI + Motor (MongoDB), rotas com prefixo /api
- IA: emergentintegrations LlmChat, OpenAI gpt-5.4 (visão) via EMERGENT_LLM_KEY
- Fotos guardadas como base64 data URLs ou URLs http no MongoDB

## Implemented (2026-07-18)
- Layout com sidebar completa agrupada + toggle de tema claro/escuro
- Dashboard avançado: 9 KPIs, 4 gráficos (receita, sessões/mês, vendas por serviço, origem clientes), ações rápidas, próximas sessões, aniversários
- Clientes (CRM completo): pesquisa, filtros, favoritos, etiquetas, perfil com separadores (sessões, galerias, contratos, orçamentos, pagamentos, histórico/linha temporal)
- Sessões: vistas Lista / Calendário (mensal) / Kanban (drag & drop), estados, valor, fotógrafo
- Galerias + IA seleção de fotos (gpt-5.4 visão)
- Orçamentos: editor com templates, aprovação (enviar/aprovar/rejeitar), conversão automática em Contrato e Fatura, pré-visualização
- Contratos: modelos com variáveis auto-preenchidas, editor, assinatura digital, estados
- Assistente de IA (gpt-5.4): chat flutuante em toda a plataforma + página /ia, com contexto do negócio (clientes, faturas por pagar, sessões) e memória multi-turno
- Financeiro: faturas/orçamentos com IVA, totais, estados
- Seed automático idempotente

## Backlog (fases seguintes do pedido alargado)
- P1: Loja online + checkout Stripe + cupões; Área do Cliente com login próprio
- P1: Financeiro avançado (despesas, lucro, fluxo de caixa, relatórios, dashboard financeiro)
- P1: Galerias premium (proteção por palavra-passe, watermark, downloads protegidos, partilha por link, marcação para álbum)
- P2: Automações (email/WhatsApp/SMS, gatilhos, fluxos); Marketing (landing pages, blog, SEO, newsletter, agendamento redes sociais)
- P2: Definições/Administração; pesquisa global; atalhos de teclado; widgets configuráveis; CRM pipeline de leads + tarefas/follow-up automático
- Técnico: dividir server.py em routers/models; contador atómico para numeração; filtros server-side por client_id

## Next Tasks
- Próxima fase sugerida: Financeiro avançado (despesas/lucro/fluxo de caixa/relatórios) OU Loja+Stripe + emails (Resend).

## Galerias Premium — Fase 7 (2026-07-18)
- Lista enriquecida: capa, nome, cliente, tipo, data, nº de fotos, estado, cadeado (protegida), botão Abrir
- Criar galeria: nome, cliente, sessão (pré-preenche tipo/data/cliente), tipo, data, capa (URL), descrição, palavra-passe
- Página da galeria: cabeçalho elegante (capa + tipo/data/nome/cliente/descrição)
- Ações por foto (fotógrafo): ♡ favoritar, ⭐ classificação 0-5 estrelas, ✓ selecionar, 💬 comentar, ⬇ download (mock), 🔍 zoom (lightbox), destacar, comparar, eliminar
- Já existentes reaproveitados: pesquisa IA, seleção IA, partilha por link + palavra-passe + expiração + watermark, portal do cliente
- Endpoints novos: rate, toggle (favorite/selected), comment (fotógrafo)
- Testado 104/105 (1 skip AI), sem bloqueios

## Área do Cliente (Portal) — Fase 6 (2026-07-18)
- Autenticação JWT (Bearer token em localStorage, bcrypt para hash); rota /portal isolada do app do fotógrafo
- Login (/portal/login) com recuperação de palavra-passe (estrutura; link registado nos logs, sem email ainda)
- Dashboard do cliente: KPIs, próxima sessão, últimas galerias, últimos documentos, ações rápidas
- Menu lateral: Início, As minhas sessões, As minhas galerias, Contratos, Orçamentos, Faturas, Downloads (estrutura), Perfil
- Todos os dados são scoped ao cliente autenticado (por client_name); password_hash nunca exposto
- Perfil editável com documento fiscal e morada adaptados por i18n
- Credenciais demo: ana.rui@email.pt / cliente123, beatriz.c@email.pt / cliente123
- Testado 88/90 backend + 11/11 frontend (fuga de password_hash corrigida)

## i18n / Internacionalização (2026-07-18)
- Camada global de configuração por país: GET/PUT /api/settings (company_name, country, language, locale, currency, timezone, date_format, tax_rate, tax_name, tax_label, address_labels)
- Presets: Portugal, Brasil, Espanha, EUA, Reino Unido, França, Outro (lib/countries.js) — extensível sem alterar código
- Formatadores dinâmicos (lib/format.js) + SettingsProvider (lib/settings.jsx); eur()/fmtDate() usam moeda/locale configurados
- Documento fiscal universal (NIF/CPF-CNPJ/VAT/EIN/Tax ID) e labels de morada (Código Postal/CEP, Distrito/Estado, Concelho/Cidade, Freguesia/Bairro) adaptam-se em Clientes, Orçamentos, Financeiro, perfil do cliente
- Cliente com campos genéricos: tax_id, postal_code, region, city, district (nif legado mantido)
- Página Definições (/definicoes) para configurar tudo com pré-visualização em tempo real
