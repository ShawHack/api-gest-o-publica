# Módulo Portal Garça Cidade de Culturas (SECULT)

Módulo nativo da API SEMIT para agenda cultural, eventos, notícias e administração SECULT.

## Integração

- **Banco:** MongoDB (mesmas coleções via Mongoose)
- **Autenticação:** JWT existente (`POST /api/users/login`) — **sem auth paralela**
- **Cadastro:** `POST /api/users/register` (CPF, termos, verificação de e-mail)
- **E-mail:** `helpers/mailer.js` (nodemailer + SMTP do `.env`) — **sem config nova**
- **Autorização:** `CulturaUserAssignment` com role `admin_cultura` + `admin` global
- **Auditoria:** `recordAudit` / `recordChange` com `module: 'cultura'`
- **Uploads:** `helpers/cultura-upload.js` → `/images/cultura/`

## Perfis

| Perfil | Como obter | Acesso |
|--------|------------|--------|
| Cidadão | Qualquer `User` com e-mail verificado | Portal, favoritos |
| Admin Cultura | Vínculo `admin_cultura` em `CulturaUserAssignment` | Painel `/cultura/admin.html` |
| Admin geral | `User.role === 'admin'` | Acesso total ao módulo |

## Rotas públicas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/cultura` | Visão geral |
| GET | `/api/posts` | Lista publicações (legado portal) |
| GET | `/api/posts/:id` | Detalhe |
| GET | `/api/categories` | Categorias |

## Rotas autenticadas

| Método | Rota | Quem |
|--------|------|------|
| POST | `/api/users/:id/events` | Cidadão (favoritos) |
| GET | `/cultura/me/saved-events` | Cidadão |

## Rotas administrativas

| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/cultura/admin/dashboard` | Staff |
| GET/POST/DELETE | `/cultura/admin/assignments` | Admin Cultura |
| POST | `/cultura/admin/assignments/by-email` | Admin Cultura |
| GET/POST/PUT/DELETE | `/api/posts` | Staff (legado) |
| GET/POST/DELETE | `/cultura/admin/categories` | Admin |

## Scripts

```bash
cd backend
node scripts/seed-cultura.js
node scripts/assign-cultura-admin.js --email usuario@garca.sp.gov.br
```

## Testes

```bash
npm test -- --testPathPattern=cultura-routes
```

## Portal estático

Publicado em `backend/public/cultura/` — usa `cultura-api.js` para login SEMIT e chamadas autenticadas.

Cadastro redireciona para `/register` (fluxo padrão Memorial/Pets).
