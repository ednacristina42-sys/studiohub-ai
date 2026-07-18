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
- Layout com sidebar + header glassmorphism, toggle de tema claro/escuro
- Dashboard: cartões de estatísticas, gráfico de receita (area), estado de projetos (pie), próximas sessões
- Clientes (CRM): criar/listar/eliminar com etiquetas
- Projetos: criar/listar/eliminar, capa, estado, orçamento
- Galerias: criar/listar/eliminar; detalhe com upload (base64), fotos exemplo, masonry
- IA seleção de fotos: pontua cada foto (0-100), tags + justificação PT, marca top ~40% como escolha IA
- Calendário: agendar/listar/eliminar sessões agrupadas por data
- Financeiro: faturas/orçamentos com itens, IVA, totais, estado, eliminação
- Seed automático de dados demo (idempotente)

## Backlog
- P1: Autenticação (JWT ou Google), entrega/partilha de galeria com cliente (link público)
- P1: Object storage dedicado para fotos (em vez de base64 no Mongo) para escala
- P2: Exportar faturas PDF, integração de pagamentos (Stripe), estatísticas avançadas
- P2: Download async de imagens (httpx) + concorrência na análise IA; contador de faturas concurrency-safe

## Next Tasks
- Aguardar feedback do utilizador; potencial: entrega de galeria ao cliente e autenticação.
