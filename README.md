# API Gestão Pública

Plataforma municipal modular com API, portais web, aplicativos Flutter e serviços operacionais.

## Componentes principais

- `backend/`: API Node.js/Express, MongoDB e workers Redis.
- `frontend/`: frontend React principal.
- `GovCidadao/`: API FastAPI e frontend Next.js.
- `Ferramentas/`: aplicação Next.js para ferramentas e conversão de documentos.
- `prefeitura_app-main/`: aplicações Flutter mobile e web.
- `cultura-src/` e `mapaturistico/`: módulos culturais e turísticos.
- `nginx/`, `monitoring/` e `docker-compose.yml`: infraestrutura.

## Configuração

Copie os arquivos `.env.example` adequados e defina os segredos fora do Git. Arquivos `.env`, credenciais Firebase concretas, uploads, builds e backups não fazem parte deste repositório.

Os builds Flutter que necessitam autenticação HTTP devem receber a senha somente durante o build:

```bash
flutter build web --dart-define=API_BASIC_AUTH_PASSWORD=<valor-seguro>
```

Consulte `docs/` e `docs/ops/` para arquitetura, deploy, restauração e operação.

## Deploy

Para atualizar serviços específicos sem derrubar toda a plataforma:

```bash
./scripts/deploy-seletivo.sh api email-worker job-worker
```

O rebuild completo permanece disponível em `rebuild.sh`. Uma parada geral só ocorre quando explicitamente solicitada com `FULL_STACK_DOWN=1`.
