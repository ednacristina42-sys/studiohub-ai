# Plano de Migração — StudioHub AI: Emergent → VPS Hostinger + MongoDB Atlas

Este documento é o guia completo para tirar o CRM StudioHub AI do Emergent.sh e
colocá-lo a correr em infraestrutura própria (VPS Hostinger), ligado a uma base
de dados MongoDB Atlas. Não implica qualquer alteração de funcionalidades — só
a forma como a aplicação é alojada e executada.

## 0. Arquitetura atual (o que existe, tal como está)

| Camada | Tecnologia | Localização no repo |
|---|---|---|
| Backend | FastAPI (Python), 1 processo `uvicorn`, API sob o prefixo `/api` | `backend/server.py` |
| Frontend | React 19 + CRA/craco, build estático | `frontend/` |
| Base de dados | MongoDB (via `motor`/`pymongo`), ligação por `MONGO_URL` + `DB_NAME` | — (atualmente o Mongo interno do Emergent) |
| Autenticação | JWT próprio (bcrypt + PyJWT) | `backend/server.py` |
| Pagamentos | Stripe | `backend/server.py` |
| Funcionalidades de IA | Pacote `emergentintegrations` + `EMERGENT_LLM_KEY` | `backend/server.py` |
| Envio de emails | API da Emergent (`https://integrations.emergentagent.com`) + `EMERGENT_EMAIL_KEY` | `backend/server.py` |

Não há servidor de ficheiros/uploads separado — ver secção 5.

**Repositório:** `github.com/ednacristina42-sys/studiohub-ai` (privado). É este o
código-fonte real da aplicação — confirmado ao explorá-lo: contém o backend
FastAPI+MongoDB, o frontend React, e o ficheiro `.emergent/emergent.yml` que
identifica a imagem-base do ambiente Emergent.

### ⚠️ Duas dependências que continuam ligadas à Emergent mesmo depois de saírem do hosting

Isto é importante e não deve ser ignorado ao planear "sair do Emergent":

1. **Funcionalidades de IA** (pesquisa em galerias, assistente) usam o pacote
   `emergentintegrations` com a chave `EMERGENT_LLM_KEY`. Este pacote depende de
   um ficheiro alojado em `customer-assets.emergentagent.com` (instalado via
   `pip`) e a chave é validada por um serviço da própria Emergent.
2. **Envio de emails** (confirmação de pagamento, notificações) chama diretamente
   `https://integrations.emergentagent.com` com `EMERGENT_EMAIL_KEY`.

Estes dois pontos são serviços da plataforma Emergent, **não** de hosting — é
possível que continuem a funcionar mesmo depois de saírem do Emergent (se a
conta/chaves se mantiverem ativas), ou que parem de funcionar se cancelarem a
subscrição por completo. **Não sabemos qual dos dois acontece sem testar.**

Recomendação: façam o deploy na VPS com as chaves atuais **antes** de cancelar
a conta Emergent, testem se a IA e os emails continuam a funcionar, e só depois
decidam se cancelam tudo ou mantêm a conta Emergent apenas para estes dois
serviços. Se deixarem de funcionar, a solução é trocar por uma chave OpenAI/Gemini
direta e um serviço de email (Resend, SendGrid, SMTP) — mas isso é uma alteração
de código a pedir separadamente, não faz parte deste plano (que é só de deploy).

---

## 1. Exportar todo o código

O código já está no GitHub: `ednacristina42-sys/studiohub-ai`. Não é preciso
"exportar" nada manualmente — a VPS vai simplesmente clonar este repositório.

Passos:
1. No editor do Emergent, confirmem que **todas** as alterações feitas na
   plataforma foram sincronizadas/guardadas no GitHub (normalmente há um botão
   "Save to GitHub" ou sincronização automática — verificar nas definições do
   projeto Emergent).
2. Isto liga diretamente ao ponto 2.

## 2. Confirmar que o GitHub está atualizado

Verificado nesta sessão: o repositório tem um único commit (`Auto-generated
changes`), datado de hoje. Isto sugere uma sincronização recente/completa a
partir do Emergent — mas confirmem manualmente:

1. Abram o editor do Emergent e verifiquem se há um indicador de "alterações
   por guardar" ou "por sincronizar com o GitHub".
2. Comparem visualmente 2-3 ficheiros críticos (`backend/server.py`,
   `frontend/src/App.js`) entre o editor Emergent e o GitHub, para confirmar
   que não há divergência.
3. Só depois de confirmarem 100% sincronizado é que devem seguir para os
   passos seguintes — qualquer trabalho feito no Emergent depois deste ponto
   não estará na VPS.

## 3. Exportar a base de dados MongoDB

Isto tem de ser feito **a partir do Emergent**, antes de desligarem o projeto lá.

1. No editor Emergent, abram um terminal/shell do backend e confirmem o valor
   atual de `MONGO_URL` e `DB_NAME` (variáveis já usadas em `backend/server.py`,
   linhas 27-29).
2. Façam um dump completo da base de dados com `mongodump` (já vem instalado
   na maioria das imagens de ambiente, ou instalar com
   `apt-get install -y mongodb-database-tools`):

   ```bash
   mongodump --uri="$MONGO_URL" --db="$DB_NAME" --out=/tmp/studiohub_dump
   ```

3. Comprimam e transfiram o dump para fora do Emergent:

   ```bash
   tar czf studiohub_dump.tar.gz -C /tmp studiohub_dump
   ```

   Descarreguem este ficheiro `.tar.gz` para o vosso computador (usando o
   explorador de ficheiros do editor Emergent, ou `scp`/download direto, conforme
   o que a plataforma disponibilizar).

4. Guardem este ficheiro em local seguro — é o backup completo de todos os
   dados (clientes, sessões, galerias, encomendas, faturas, etc.) **incluindo
   as fotos**, porque, como explicado na secção 5, as fotos estão guardadas
   dentro dos próprios documentos MongoDB.

## 4. Variáveis de ambiente necessárias

Levantamento feito diretamente no código-fonte (`backend/server.py` e
`frontend/src/lib/api.js`). Ficheiros de referência já criados no repositório:
`backend/.env.example` e `frontend/.env.example`.

### Backend (`backend/.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `MONGO_URL` | Sim | Connection string do MongoDB (vai passar a ser a do Atlas) |
| `DB_NAME` | Sim | Nome da base de dados |
| `JWT_SECRET` | Sim | Segredo para assinar tokens de sessão |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Não | Cria automaticamente o primeiro utilizador admin no arranque, se ainda não existir |
| `CORS_ORIGINS` | Sim | Domínio(s) do frontend autorizados a chamar a API |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Sim, se usam pagamentos | Chaves da conta Stripe |
| `EMERGENT_LLM_KEY` | Só se quiserem manter a IA | Ver aviso na secção 0 |
| `EMERGENT_EMAIL_KEY` / `EMAIL_FROM_NAME` / `PHOTOGRAPHER_EMAIL` | Só se quiserem manter o envio de emails | Ver aviso na secção 0 |

### Frontend (`frontend/.env` — só usada em tempo de *build*, não em runtime)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `REACT_APP_BACKEND_URL` | Sim | URL pública do backend (ex.: `https://app.oteudominio.pt`, sem `/api` no fim) |

Todos estes valores atuais só existem dentro do ambiente Emergent — vão ter de
os copiar de lá (das definições/secrets do projeto) para os ficheiros `.env`
na VPS. Nenhum destes valores está no código-fonte nem neste plano.

## 5. Onde estão os uploads/imagens

Levantamento feito no código: **não existe pasta de uploads nem armazenamento
de ficheiros separado** (nada de S3, disco local, ou pasta `/uploads`).

Quando um utilizador carrega uma foto (`frontend/src/pages/GalleryDetail.jsx`),
o browser converte a imagem para **base64** (`FileReader.readAsDataURL`) e
envia-a diretamente para a API, que a guarda **dentro do próprio documento
MongoDB** (`galleries.photos[].url`).

Consequência prática: **as imagens já vêm incluídas no dump do MongoDB do
passo 3** — não há nenhum passo extra de migração de ficheiros. A única
atenção necessária é de infraestrutura: como as imagens viajam em pedidos
JSON/base64 (maiores que o ficheiro original em ~33%), o Nginx e o tamanho do
dump precisam de margem — já configurado (`client_max_body_size 50m` em
`nginx/studiohub.conf`).

## 6. docker-compose para produção

Já criado em `docker-compose.prod.yml`, com dois serviços:

- **`backend`** — constrói a partir de `backend/Dockerfile`, corre `uvicorn`,
  publicado apenas em `127.0.0.1:8001` (não fica exposto diretamente à
  internet — só o Nginx do host lhe acede).
- **`frontend`** — constrói a partir de `frontend/Dockerfile` (build React
  multi-stage, servido por um Nginx interno ao contentor), publicado em
  `127.0.0.1:3000`.

Não há contentor de MongoDB — a base de dados é externa (Atlas), por isso não
faz parte do `docker-compose`.

Ficheiros associados:
- `backend/Dockerfile`, `backend/.dockerignore`, `backend/.env.example`
- `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/nginx.conf`, `frontend/.env.example`
- `.env.example` (na raiz — usado pelo `docker compose` para o `REACT_APP_BACKEND_URL` de build)

## 7. Nginx (proxy reverso + SSL, no próprio VPS)

Ficheiro criado: `nginx/studiohub.conf`. Corre **fora** do Docker, diretamente
no VPS (é o padrão mais simples e mais fácil de manter com o `certbot`).
Responsabilidades:

- Recebe todo o tráfego público em `80`/`443`.
- `/api/*` → encaminha para o contentor backend (`127.0.0.1:8001`).
- Tudo o resto → encaminha para o contentor frontend (`127.0.0.1:3000`).
- Faz terminação SSL (Let's Encrypt via `certbot`, ver passo 8.6).

## 8. Deploy numa VPS Hostinger

### 8.1. Criar/preparar a VPS
1. No painel Hostinger (hPanel), criar (ou usar uma existente) uma VPS com
   Ubuntu 22.04/24.04 LTS. Para esta aplicação (FastAPI + React + Nginx, sem
   Mongo local), um plano com **2 vCPU / 4 GB RAM** é confortável.
2. Apontar o DNS: no vosso registador de domínio (ou no DNS da Hostinger),
   criar um registo `A` para `app.oteudominio.pt` → IP público da VPS.

### 8.2. Acesso e atualização do sistema
```bash
ssh root@<IP_DA_VPS>
apt update && apt upgrade -y
```

### 8.3. Instalar Docker e Docker Compose
```bash
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
```

### 8.4. Clonar o repositório
```bash
apt install -y git
git clone https://github.com/ednacristina42-sys/studiohub-ai.git /opt/studiohub-ai
cd /opt/studiohub-ai
```
(Repositório privado: usar um token de acesso pessoal do GitHub como password,
ou configurar uma chave SSH de deploy.)

### 8.5. Configurar variáveis de ambiente
```bash
cp backend/.env.example backend/.env
cp .env.example .env
nano backend/.env   # preencher com os valores reais (secção 4 e 9)
nano .env           # REACT_APP_BACKEND_URL=https://app.oteudominio.pt
```

### 8.6. Instalar Nginx + Certbot no host e ativar o site
```bash
apt install -y nginx certbot python3-certbot-nginx
cp nginx/studiohub.conf /etc/nginx/sites-available/studiohub.conf
sed -i 's/app.oteudominio.pt/DOMINIO_REAL_AQUI/' /etc/nginx/sites-available/studiohub.conf
ln -s /etc/nginx/sites-available/studiohub.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d app.oteudominio.pt
```
O `certbot` atualiza automaticamente o ficheiro de config para servir em HTTPS
e renova o certificado sozinho (via `systemd timer`/`cron` que já instala).

### 8.7. Subir a aplicação
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

### 8.8. Firewall
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```
(As portas 8001 e 3000 dos contentores só estão publicadas em `127.0.0.1`,
por isso não precisam de regra de firewall própria — só são acessíveis a
partir da própria VPS, via Nginx.)

## 9. Ligar ao MongoDB Atlas

1. Criar conta em `mongodb.com/cloud/atlas` (tem tier gratuito M0, suficiente
   para começar; podem fazer upgrade depois se o volume de dados crescer).
2. Criar um **Cluster** (M0 grátis ou o tier pago que preferirem).
3. **Database Access** → criar um utilizador de base de dados (ex.
   `studiohub_app`) com password forte e permissão `readWrite` na base de dados
   do projeto.
4. **Network Access** → adicionar o **IP público da VPS Hostinger** à lista de
   IPs permitidos (evitar usar `0.0.0.0/0` em produção).
5. **Connect** → "Drivers" → copiar a *connection string* (formato
   `mongodb+srv://...`). Esse é o valor de `MONGO_URL` em `backend/.env`.
6. Restaurar o dump feito no passo 3, apontando já para o Atlas:
   ```bash
   tar xzf studiohub_dump.tar.gz
   mongorestore --uri="mongodb+srv://studiohub_app:<password>@<cluster>.mongodb.net" \
     --db=studiohub studiohub_dump/studiohub
   ```
   (Ajustar `studiohub`/`DB_NAME` ao valor real usado no Emergent, verificado
   no passo 3.)
7. Confirmar índices: o backend cria automaticamente alguns índices no
   arranque (`db.users.create_index("email", unique=True)`, etc. — ver
   `backend/server.py`, evento `startup`), por isso não é preciso recriá-los
   manualmente; bastam alguns segundos após o primeiro arranque do contentor
   `backend`.

## 10. Guia passo a passo — ordem de execução recomendada

Resumo com a ordem certa para não perderem dados nem terem período de indisponibilidade maior do que o necessário:

1. ✅ Confirmar GitHub atualizado (secção 2).
2. ✅ Exportar dump do MongoDB a partir do Emergent (secção 3) — **fazer isto
   por último antes de desligar o Emergent**, para o dump ser o mais recente
   possível.
3. ✅ Criar o cluster MongoDB Atlas e o utilizador de base de dados (secção 9,
   passos 1-4) — pode ser feito em qualquer altura, não depende do Emergent.
4. ✅ Provisionar a VPS Hostinger, instalar Docker/Nginx/Certbot, clonar o
   repositório (secção 8.1 a 8.4).
5. ✅ Restaurar o dump no Atlas (secção 9, passo 6).
6. ✅ Preencher `backend/.env` e `.env` com todos os valores reais (secção 4),
   incluindo a connection string do Atlas.
7. ✅ Configurar Nginx + SSL (secção 8.6).
8. ✅ `docker compose up -d --build` (secção 8.7).
9. ✅ Testar a aplicação a fundo no novo domínio: login, criação de cliente,
   upload de foto numa galeria, checkout Stripe (em modo teste), e — em
   particular — testar se a IA e o envio de emails continuam a funcionar
   com as chaves Emergent (ver aviso na secção 0).
10. ✅ Atualizar o **webhook do Stripe** no dashboard da Stripe para apontar
    para `https://app.oteudominio.pt/api/stripe/webhook` (rota confirmada em
    `backend/server.py`, linha 1221) — os webhooks antigos continuam a apontar
    para o domínio do Emergent e vão deixar de chegar.
11. ✅ Só depois de tudo confirmado a funcionar na VPS: desligar/cancelar o
    projeto no Emergent.

### Rollback

Enquanto o projeto Emergent não for desligado (passo 11), ele continua
disponível como "plano B" — se algo correr mal na VPS, o DNS pode ser revertido
para o domínio do Emergent sem perda de dados, desde que ainda não tenham
apontado o domínio final para lá em definitivo.
