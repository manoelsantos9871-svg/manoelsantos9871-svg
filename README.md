# HealthTech DETS — Sistema de Gestão de Tecnologia em Saúde

Sistema corporativo web-based para gestão integral de tarefas, demandas, projetos e ordens de serviço do **Departamento de Tecnologia em Saúde (DETS)** da Secretaria Municipal de Saúde.

---

## Módulos Implementados

| Módulo | Funcionalidades |
|--------|----------------|
| **Autenticação** | Login/senha, MFA (TOTP), JWT com refresh tokens, RBAC |
| **Gestão de Usuários** | CRUD completo, perfis (Admin/Gestor/Técnico/Solicitante), ativação/desativação |
| **Demandas** | Abertura, triagem, atribuição, fluxo completo, comentários, histórico |
| **Tarefas** | Decomposição de demandas, time tracking, status, responsáveis |
| **Ordens de Serviço** | Geração automática, checklist técnico, assinatura, execução em campo |
| **SLA** | Configuração por tipo/prioridade, monitoramento, alertas de violação |
| **Dashboard** | Indicadores em tempo real, gráficos, top técnicos, tempo médio |
| **Relatórios** | Análise por tipo, prioridade, produtividade, tempo de resolução |
| **Auditoria** | Log imutável de todas as ações, rastreabilidade completa |
| **Configurações** | Tema claro/escuro, troca de senha, configuração MFA |

---

## Stack Tecnológica

### Backend
- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** + **Prisma ORM**
- **JWT** (access + refresh tokens) + **bcrypt**
- **Speakeasy** (TOTP/MFA) + **QRCode**
- **Socket.io** (notificações real-time)
- **Winston** (logging) + **Helmet** (segurança)
- **Zod** (validação de schemas)

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (design responsivo, tema claro/escuro)
- **TanStack Query** (gerenciamento de estado e cache)
- **Zustand** (estado global)
- **React Router v6** (roteamento SPA)
- **Recharts** (gráficos e dashboard)
- **React Hook Form** + **Zod** (formulários validados)

### Infraestrutura
- **Docker** + **Docker Compose**
- **nginx** (proxy reverso, SPA routing)
- **Redis** (sessões, cache)

---

## Início Rápido

### Pré-requisitos
- Docker & Docker Compose
- Node.js 20+ (para desenvolvimento local)

### Com Docker (Produção)

```bash
# 1. Clonar e configurar variáveis
cp backend/.env.example backend/.env
# Edite backend/.env com suas configurações

# 2. Subir todos os serviços
docker-compose up -d

# 3. Executar seed (dados iniciais)
docker-compose exec backend npx ts-node prisma/seed.ts
```

Acesso: http://localhost

### Desenvolvimento Local

```bash
# Terminal 1 — Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npx ts-node prisma/seed.ts
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Acesso: http://localhost:5173

---

## Credenciais Padrão (após seed)

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Administrador | admin@saude.gov.br | Admin@2024! |
| Gestor | gestor@saude.gov.br | Gestor@2024! |
| Técnico | tecnico1@saude.gov.br | Tecnico@2024! |
| Solicitante | solicitante@saude.gov.br | Solicitante@2024! |

> ⚠️ Altere as senhas imediatamente em ambiente de produção.

---

## Arquitetura da API

```
/api
├── /auth          — Autenticação, MFA, refresh tokens
├── /users         — Gestão de usuários (RBAC)
├── /demands       — Demandas e chamados
├── /tasks         — Tarefas vinculadas a demandas
├── /service-orders — Ordens de Serviço
├── /sla           — Configuração e estatísticas de SLA
├── /dashboard     — Indicadores e métricas
├── /audit         — Logs de auditoria
└── /catalog       — Unidades e categorias
```

---

## Segurança

- TLS 1.2+ (em trânsito via nginx)
- AES-256 via bcrypt para senhas em repouso
- Conformidade com **LGPD** (Lei 13.709/2018)
- Proteção OWASP Top 10 (Helmet, rate limiting, validação)
- Controle de sessão com tokens de curta duração (15min) e refresh (7 dias)
- MFA opcional via TOTP (Google Authenticator, Authy)
- Logs de auditoria imutáveis com IP e User-Agent

---

## Perfis de Acesso (RBAC)

| Ação | Solicitante | Técnico | Gestor | Admin |
|------|:-----------:|:-------:|:------:|:-----:|
| Abrir demanda | ✓ | ✓ | ✓ | ✓ |
| Atualizar status | — | ✓ | ✓ | ✓ |
| Gerenciar usuários | — | — | ✓ | ✓ |
| Configurar SLA | — | — | ✓ | ✓ |
| Ver auditoria | — | — | ✓ | ✓ |
| Criar usuários | — | — | — | ✓ |
| Configurações do sistema | — | — | — | ✓ |

---

## Variáveis de Ambiente (backend/.env)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<segredo_forte>
JWT_REFRESH_SECRET=<segredo_refresh>
BCRYPT_ROUNDS=12
SMTP_HOST=smtp.example.com
SMTP_USER=noreply@example.com
SMTP_PASS=<senha>
FRONTEND_URL=https://seu-dominio.com
```

---

## Secretaria Municipal de Saúde — DETS

Sistema desenvolvido para atender aos princípios da administração pública:
**Eficiência · Transparência · Rastreabilidade · Padronização · Governança**
