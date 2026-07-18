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
- Próxima fase sugerida: Galerias Premium + Área do Cliente (login) OU Financeiro avançado. Aguardar escolha do utilizador.
