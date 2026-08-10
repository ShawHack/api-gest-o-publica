# Módulo Portal Municipal da Educação

Módulo nativo da API SEMIT para gestão pública e administrativa da Secretaria Municipal de Educação, unidades escolares, conselhos, legislação, transparência, calendário, galerias e documentos.

## Integração

- **Banco:** MongoDB (mesmo cluster/coleções via Mongoose)
- **Autenticação:** JWT/API Key existentes (`verify-token.js`)
- **Autorização:** vínculos em `EducationUserAssignment` + `admin` global
- **Auditoria:** `recordAudit` / `recordChange` com `module: 'education'`
- **Uploads:** `helpers/education-upload.js` → `/images/education/`

## Perfis (roles em EducationUserAssignment)

| Perfil | Role | Escopo |
|--------|------|--------|
| Administrador Geral | `education_admin` | Todo o módulo |
| Secretaria Municipal | `education_secretary` | Secretaria + supervisão/aprovação |
| Gestor de Unidade | `education_manager` | **Uma unidade por vínculo** — escola, creche, EMEI, etc. cadastrada no portal |

Cada unidade escolar municipal deve receber seu gestor no momento do vínculo (`educationEntityId` obrigatório). Um mesmo usuário pode ser gestor de mais de uma unidade (dois vínculos distintos), mas não existe gestor global do módulo.

| Usuário de Conselho | `education_council` | Apenas conselho vinculado |

Usuários com `role: admin` no `User` têm acesso total ao módulo.

## Rotas públicas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/education` | Visão geral do módulo |
| GET | `/education/entities` | Diretório de unidades (filtros: `type`, `neighborhood`, `q`) |
| GET | `/education/entities/:slug` | Página da unidade |
| GET | `/education/news` | Notícias/comunicados publicados |
| GET | `/education/news/:slug` | Detalhe da publicação |
| GET | `/education/councils` | Lista conselhos |
| GET | `/education/councils/:slug` | Página do conselho |
| GET | `/education/legislation` | Legislação educacional |
| GET | `/education/transparency` | Documentos de transparência |
| GET | `/education/calendar` | Calendário (filtros: `month`, `year`, `type`, `entitySlug`) |
| GET | `/education/galleries` | Galerias |
| GET | `/education/documents` | Documentos públicos |

Prefixo `/api` também funciona (ex.: `/api/education/entities`).

## Rotas administrativas

Todas exigem `Authorization: Bearer <token>`.

| Método | Rota | Permissão mínima |
|--------|------|------------------|
| GET | `/education/admin/dashboard` | Staff do módulo |
| GET/POST/DELETE | `/education/admin/assignments` | Admin do módulo |
| GET/POST/PUT/DELETE | `/education/admin/entities` | Staff / Admin |
| GET/POST/PUT/PATCH/DELETE | `/education/admin/posts` | Staff (escopo por entidade) |
| GET/POST/PUT/DELETE | `/education/admin/documents` | Staff |
| GET/POST/PUT/DELETE | `/education/admin/legislation` | Admin / Secretaria |
| GET/POST/PUT/DELETE | `/education/admin/calendar` | Staff |
| GET/POST/PUT/DELETE | `/education/admin/galleries` | Staff |

Workflow de publicação: `draft` → `pending_review` → `published` (via `PATCH .../publish`) ou `archived`.

## Models

- `EducationEntity` — unidades e órgãos
- `EducationUserAssignment` — vínculo usuário ↔ entidade ↔ perfil
- `EducationPost` — publicações
- `EducationDocument` — documentos públicos
- `EducationLegislation` — legislação
- `EducationCalendarEvent` — calendário
- `EducationGallery` — galerias (itens embutidos)

## Seed

```bash
cd backend
node scripts/seed-education.js
```

Cria Secretaria, CME, CAE, CACS-FUNDEB, escolas/creches de exemplo e eventos de calendário.

## Testes

```bash
cd backend
npm test -- --testPathPattern=education
```

## Fase futura — Portal do Aluno e dos Pais

Não implementado. Ver comentários em `helpers/education-constants.js` (`FUTURE_STUDENT_PORTAL`).

Extensão planejada: models `StudentProfile`, `GuardianLink` e rotas `/education/student/*`, `/education/parent/*`.

## Vincular administrador do módulo

```bash
node backend/scripts/assign-education-admin.js --email educacao@garca.sp.gov.br
```

Concede o perfil `education_admin` (acesso total ao painel). Requer usuário já cadastrado no sistema.

## Vincular um gestor a uma escola

O gestor **sempre** é criado junto com a unidade escolar alvo. Ao cadastrar novas EMEFs, EMEIs ou creches, vincule um gestor para cada uma.

### Painel administrativo

No painel **Educação → Vínculos e perfis** (visível para `education_admin`), é possível vincular usuários por e-mail, escolher o perfil e a unidade escolar/conselho correspondente.

### Script (alternativa)

```bash
node backend/scripts/assign-education-manager.js \
  --email gestor@emef-exemplo.sp.gov.br \
  --entity-slug emef-joao-silva
```

### API

```http
POST /api/education/admin/assignments
Authorization: Bearer <token-admin>
Content-Type: application/json

{
  "userId": "<id-do-usuario>",
  "educationEntityId": "<id-da-escola>",
  "role": "education_manager"
}
```

`educationEntityId` é **obrigatório** e deve ser uma unidade do tipo escola, creche, EMEI, centro educacional ou projeto educacional.
