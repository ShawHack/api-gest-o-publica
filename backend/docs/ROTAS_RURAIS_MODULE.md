# Módulo Estradas Rurais (Rotas) — API, whitelist e LPR

## Visão geral

- Catálogo geográfico de UPAs: Firebase RTDB `upa-rural` (leitura no app).
- Dados operacionais (vínculos, veículos, eventos LPR, alertas): MongoDB via `api-semit`.
- Alertas de placa desconhecida vão **somente** para a central SEMIT (`rotas_admin` / `admin`).

## Roles

| Role | Uso |
|------|-----|
| `usuario` | Proprietário solicita vínculo UPA e cadastra veículos |
| `rotas_admin` | Aprova vínculos/veículos e opera alertas LPR |
| `admin` | Mesmas permissões de `rotas_admin` no módulo |

## Endpoints (`/api/rotas-rurais`)

| Método | Path | Auth |
|--------|------|------|
| POST | `/lpr/intelbras` | `X-API-Key` (`LPR_INTELBRAS_API_KEY` ou `API_KEYS`) |
| POST | `/ownership` | JWT |
| GET | `/ownership/mine` | JWT |
| GET | `/ownership` | admin rotas |
| PATCH | `/ownership/:id` | admin rotas |
| POST | `/vehicles` | JWT (cria `pending`; exige consentimento LGPD) |
| GET | `/vehicles/mine` | JWT |
| GET | `/vehicles` | admin rotas |
| PATCH | `/vehicles/:id` | admin rotas |
| GET | `/alerts` | admin rotas |
| PATCH | `/alerts/:id` | admin rotas |

## LGPD e auditoria

- Cadastro de veículo exige `consentAccepted: true`; grava `consentAcceptedAt`.
- Acesso a whitelist/alertas restrito a SEMIT (`admin` / `rotas_admin`).
- Ações de criar/revisar vínculo, veículo e alerta registram auditoria (`module: rotas-rurais`).
- Retenção de eventos LPR / snapshots: configurar operacionalmente (`LPR_ALERT_COOLDOWN_MINUTES` padrão 30); política de purge pode ser adicionada depois.

## Variáveis de ambiente

- `LPR_INTELBRAS_API_KEY` — chave do webhook Intelbras
- `LPR_ALERT_COOLDOWN_MINUTES` — janela de deduplicação alerta (placa + câmera)

## Classificação LPR

- **known**: placa na whitelist `approved` e dentro de `validFrom`/`validUntil`
- **unknown**: fora da whitelist → cria/atualiza `UnknownVehicleAlert` (com cooldown)
