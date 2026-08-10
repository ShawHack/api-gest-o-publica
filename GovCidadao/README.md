# GovCidadao - MVP (API + Frontend)

Implementacao inicial do GovCidadao com backend FastAPI + MongoDB e frontend Next.js:

- Cadastro e listagem de ocorrencias (input interno e cidadao)
- Priorizacao automatica por urgencia + reincidencia
- Deteccao de possivel duplicidade por proximidade geografica
- Regras iniciais de medidas protetivas
- Endpoint de dados agregados para heatmap
- Catalogo de secretarias/categorias com SLA
- Painel web operacional para registrar e acompanhar ocorrencias

## Requisitos

- Python 3.11+
- MongoDB local ou remoto
- Node.js 20+ (para executar frontend localmente)

## Execucao local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Acesse:

- Swagger: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`

## Execucao local - Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Acesse:

- Frontend: `http://127.0.0.1:3000`

## Execucao com Docker Compose

```bash
docker compose up --build -d
```

Acesse:

- Frontend: `http://127.0.0.1:3010`
- Swagger: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`

Login demo no frontend:

- Admin: `admin@gov.local` / `123456`
- Secretario: `secretario@gov.local` / `123456`
- Cidadao: `cidadao@gov.local` / `123456`

Parar os servicos:

```bash
docker compose down
```

Ver logs em tempo real:

```bash
docker compose logs -f api
docker compose logs -f mongo
docker compose logs -f frontend
```

## Atalhos com Makefile

```bash
make up
make down
make restart
make logs
make logs-api
make logs-mongo
make logs-frontend
make ps
make health
make health-wait
make dev
```

Fluxo recomendado apos subir:

```bash
make up
make health-wait
```

## Endpoints principais

- `GET /catalog/secretariats`
- `GET /catalog/categories`
- `POST /catalog/categories`
- `POST /auth/login`
- `GET /auth/me`
- `GET /users` (admin)
- `POST /users/secretaries` (admin)
- `POST /occurrences`
- `GET /occurrences`
- `PATCH /occurrences/{occurrence_id}`
- `GET /occurrences/heatmap`
- `GET /occurrences/protective-measures`
