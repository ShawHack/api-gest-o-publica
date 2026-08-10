# Plano — Módulo de Gestão de Campanhas de Castração

Documento de arquitetura e implementação. **Nenhum código de produção alterado até aprovação.**

Integra o levantamento inicial + requisitos essenciais: vagas, status, notificações, campanha, campos clínicos, comprovante, histórico e visão de módulo completo.

---

## 1. Visão: módulo, não só formulário

```
┌─────────────────────────────────────────────────────────────────┐
│                  MÓDULO CASTRAÇÃO (SAMA)                       │
├─────────────┬─────────────┬──────────────┬────────────────────┤
│  Campanhas  │ Solicitações│ Agendamento  │ Relatórios/Export  │
│  (vagas,    │ (protocolo, │ (data cirurgia│ (CSV/PDF, histórico│
│   datas)    │  status)    │  local)      │  por campanha)     │
├─────────────┴─────────────┴──────────────┴────────────────────┤
│ Notificações (e-mail) │ Auditoria │ Controle de acesso (sama) │
└─────────────────────────────────────────────────────────────────┘
```

**Princípio:** uma **campanha ativa** por vez (com histórico de campanhas encerradas). O flag legado `castration_closed` permanece como **espelho de compatibilidade** para Flutter e toggle atual.

---

## 2. Estado atual (resumo)

| Item | Situação |
|------|----------|
| Abrir/fechar campanha | `SystemSetting.castration_closed` (boolean) |
| API | `SystemSettingController`, rotas `/v1/castracao/*` |
| UI web | SPA Garça Pet em `backend/public/sama/` + patches |
| Solicitações | **Inexistente** |
| User: whatsapp, city, address | **Inexistente** (phone, cpf, email, name existem) |
| E-mail | `helpers/mailer.js` + fila Redis (`email-queue-worker`) |
| PDF | Cliente (compliance/votação CSV); jsPDF chunk no bundle SAMA |
| Permissão sama | `requireRole('sama')` em `authz.js` |

---

## 3. Modelo de dados

### 3.1 `CastrationCampaign` (nova collection)

Substitui o boolean isolado como fonte de verdade; `castration_closed` sincroniza com `status !== 'open'`.

```text
CastrationCampaign {
  name: String                    // ex: "Campanha Castração 2026"
  year: Number
  status: 'draft' | 'open' | 'full' | 'closed'
  // full = vagas esgotadas (auto ou manual)

  opensAt: Date                   // abertura programada (opcional)
  closesAt: Date                  // encerramento programado (opcional)
  surgeryDate: Date               // data da cirurgia
  location: String                // local da castração
  notes: String                   // observações públicas da campanha

  maxAnimals: Number              // capacidade total da campanha
  reservedAnimals: Number         // contador atômico (vagas preenchidas)
  // disponíveis = maxAnimals - reservedAnimals

  closedAt: Date
  closedReason: 'manual' | 'full' | 'scheduled' | 'cancelled'

  createdBy: ObjectId
  timestamps
}
```

**Índices:** `status`, `year`, `createdAt`.

**Regras de vagas:**
- Ao criar solicitação: `animals.length` consome vagas.
- Se `reservedAnimals + n > maxAnimals`:
  - **Opção A (recomendada):** rejeitar com mensagem “vagas esgotadas”.
  - **Opção B:** aceitar com status `lista_de_espera` (não consome vaga até aprovação).
- Quando `reservedAnimals >= maxAnimals` → `status = 'full'` + sync `castration_closed = true`.

**Compatibilidade:** ao abrir campanha pelo toggle atual, criar/ativar documento `CastrationCampaign` ou atualizar campanha ativa.

### 3.2 `CastrationRequest` (solicitação)

```text
CastrationRequest {
  protocol: String                // CAST-2026-000042 (unique)
  campaignId: ObjectId            // ref CastrationCampaign
  userId: ObjectId

  applicant: {                     // snapshot no envio
    name, cpf, phone, whatsapp, email, city, address
  }

  animals: [{
    species: 'cachorro' | 'gato' | 'outro'
    speciesOther: String
    name: String
    birthYearOrAge: String
    weightKg: Number
    breed: String
    sex: 'macho' | 'femea'
    previouslyCastrated: Boolean
    notes: String

    // Campos clínicos (essenciais)
    isCommunityAnimal: Boolean
    hasGuardian: Boolean
    isPregnant: Boolean          // relevante se fêmea
    inHeat: Boolean
    hasDiseases: Boolean
    diseasesDetail: String
    onContinuousMedication: Boolean
    medicationDetail: String
    isAggressive: Boolean
  }]

  animalCount: Number
  status: Enum (ver §4)
  statusHistory: [{
    status, changedAt, changedBy, note
  }]

  scheduledAt: Date               // data/hora agendada (quando status = agendada)
  scheduledLocation: String       // pode herdar da campanha ou sobrescrever
  refusalReason: String

  ip, userAgent, client
  receiptPdfPath: String          // opcional: path do comprovante gerado
  timestamps
}
```

### 3.3 Extensão `User` (opcional, fase 1b)

```text
whatsapp, city, address  // opcionais, para pré-preenchimento
```

### 3.4 Sequência de protocolo

`SystemSetting` key `castration_protocol_seq_{year}` ou helper `nextCastrationProtocol(year)`.

---

## 4. Status da solicitação (workflow)

| Status | Código | Quem altera | Notifica cidadão? |
|--------|--------|-------------|-------------------|
| Pendente | `pendente` | Sistema (ao enviar) | ✅ confirmação + PDF |
| Em análise | `em_analise` | SAMA | ✅ |
| Aprovada | `aprovada` | SAMA | ✅ |
| Lista de espera | `lista_de_espera` | Sistema ou SAMA | ✅ |
| Recusada | `recusada` | SAMA | ✅ (+ motivo) |
| Agendada | `agendada` | SAMA | ✅ (+ data/local) |
| Realizada | `realizada` | SAMA | ✅ |
| Cancelada | `cancelada` | Cidadão ou SAMA | ✅ |

**Transições:** validadas em `castration-request-service.js` (máquina de estados). Ex.: `realizada` só a partir de `agendada`.

**Acompanhamento cidadão:** `GET /castration-requests/mine` com status atual + histórico.

---

## 5. Campanha na tela pública

Quando `status === 'open'` (e vagas > 0), exibir automaticamente:

| Dado | Origem |
|------|--------|
| Data de abertura / encerramento | `opensAt`, `closesAt` |
| Data da cirurgia | `surgeryDate` |
| Local | `location` |
| Observações | `notes` |
| **Vagas disponíveis** | `maxAnimals - reservedAnimals` |
| **Vagas preenchidas** | `reservedAnimals` |
| Formulário de solicitação | Patch web (se logado) |

Se `full` ou `closed`: banner “campanha encerrada” (reutiliza hero existente) + sem formulário.

---

## 6. Notificações

Reutilizar `helpers/mailer.js` (padrão `AdoptionRequestController`).

| Evento | Destinatário | Template |
|--------|--------------|----------|
| Solicitação enviada | Cidadão (e-mail do snapshot) | Protocolo, resumo animais, link comprovante |
| Nova solicitação | SAMA (lista configurável ou role sama) | Protocolo, solicitante, qtd animais |
| Mudança de status | Cidadão | Status novo + texto orientativo |
| Agendamento definido | Cidadão | Data, local, orientações pré-cirúrgicas |
| Campanha encerrada (vagas) | Opcional broadcast | Aviso público |

**Config sugerida:** `CASTRATION_SAMA_NOTIFY_EMAILS` no `.env` (fallback: usuários `role=sama` com e-mail).

Fila Redis quando `REDIS_URL` definido (mesmo padrão de e-mail da adoção).

---

## 7. Comprovante PDF (cidadão)

| Momento | Ação |
|---------|------|
| Após `POST` bem-sucedido | Gerar PDF com protocolo, dados solicitante, lista de animais, data/hora |
| Resposta API | `{ protocol, receiptUrl }` ou base64 inline |
| Download imediato | Botão no front pós-envio |
| Reimpressão | `GET /castration-requests/mine/:id/receipt.pdf` (JWT, só dono) |

**Implementação:** preferir geração **server-side** (PDF consistente) com `pdfkit` (nova dependência leve) ou HTML→PDF; fallback client-side jsPDF no patch.

Layout: cabeçalho Prefeitura de Garça / SAMA, número de protocolo em destaque, tabela de animais, rodapé com data e aviso legal.

---

## 8. Área administrativa SAMA

### 8.1 Menu (exclusivo `role === 'sama'`)

- **Campanha ativa** — editar vagas, datas, local, observações; abrir/fechar
- **Solicitações de castração** — listagem, filtros, alteração de status, agendamento
- **Campanhas anteriores** — histórico + indicadores

### 8.2 Listagem de solicitações

Filtros: nome, CPF, telefone, cidade, protocolo, status, campanha.  
Ordenação: data, cidade, quantidade de animais.

### 8.3 Campanhas anteriores (prestação de contas)

Por campanha encerrada:

| Indicador | Cálculo |
|-----------|---------|
| Total solicitações | `count(requests)` |
| Total animais inscritos | `sum(animalCount)` |
| Animais atendidos (`realizada`) | agregação por status |
| Por espécie | `$unwind animals` + `$group` |
| Export CSV/PDF | rotas admin |

---

## 9. API REST (módulo completo)

### Campanhas (`/castration-campaigns`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/active` | Público | Campanha ativa + contador vagas |
| GET | `/` | sama | Listar (incl. histórico) |
| POST | `/` | sama | Criar campanha |
| PATCH | `/:id` | sama | Editar datas, vagas, local, notas |
| POST | `/:id/open` | sama | Abrir (+ sync `castration_closed`) |
| POST | `/:id/close` | sama | Encerrar manual |
| GET | `/:id/stats` | sama | Indicadores da campanha |

### Solicitações (`/castration-requests`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/me/prefill` | JWT | Dados do usuário |
| POST | `/` | JWT | Criar (valida campanha aberta + vagas) |
| GET | `/mine` | JWT | Minhas solicitações + status |
| GET | `/mine/:id/receipt.pdf` | JWT | Reimprimir comprovante |
| GET | `/` | sama | Listagem admin |
| GET | `/:id` | sama | Detalhe |
| PATCH | `/:id/status` | sama | Alterar status (+ histórico + e-mail) |
| PATCH | `/:id/schedule` | sama | Definir data/local agendamento |
| GET | `/export.csv` | sama | CSV (filtros query) |
| GET | `/:id/export.pdf` | sama | PDF relatório individual |

**Legado:** manter `GET /v1/castracao/status` e `PATCH /v1/castracao/update` delegando à campanha ativa.

---

## 10. Segurança e auditoria

| Camada | Medida |
|--------|--------|
| Backend | `verifyToken`, `requireRole('sama')` nas rotas admin |
| Backend | IDOR: cidadão só `mine` e receipt próprio |
| Backend | Validação de vagas e status no servidor (nunca no front) |
| Frontend | Menu/links admin só renderizados para sama (não substitui API) |
| Mongo | Índices + `campaignId` obrigatório em solicitações |
| Audit | `castration_campaign.*`, `castration_request.*`, exports, mudanças de status |

---

## 11. Frontend (estratégia)

| Superfície | Abordagem |
|------------|-----------|
| Web Garça Pet | `patch-castration-module.js` (formulário + painel sama + histórico) |
| `sama/index.html` | Registrar novo patch |
| Flutter app | Fase 2: status “minhas solicitações” + formulário |
| Memorial `frontend/` | Sem impacto |

**Contador de vagas** e dados da campanha: consumir `GET /castration-campaigns/active`.

---

## 12. Fases de implementação (revisadas)

### Fase 1 — Backend núcleo (5–7 dias)
- Models `CastrationCampaign`, `CastrationRequest`
- Serviços: protocolo, vagas, status, sync `castration_closed`
- APIs campanha + solicitação (create, list sama, mine)
- Testes Jest + audit

### Fase 2 — Workflow e notificações (3–4 dias)
- Máquina de estados + `statusHistory`
- Templates e-mail (enviada, status, agendamento, nova para SAMA)
- PATCH status/schedule (sama)

### Fase 3 — Web cidadão (3–4 dias)
- Patch: banner campanha, contador vagas, formulário multi-animal com campos clínicos
- Comprovante PDF pós-envio + reimpressão
- “Minhas solicitações” (status)

### Fase 4 — Web admin SAMA (4–5 dias)
- Gestão campanha ativa
- Listagem, filtros, alteração status, agendamento
- Export CSV/PDF
- Aba campanhas anteriores + stats

### Fase 5 — Perfil, mobile, hardening (2–3 dias)
- Campos User (whatsapp, city, address)
- Flutter (opcional)
- Playwright smoke, rate limit, documentação operacional

**Estimativa total:** 17–23 dias úteis (1 dev), podendo paralelizar fases 2 e 3 após Fase 1.

---

## 13. Critérios de aceitação (atualizados)

- [ ] Campanha com vagas máximas, contador disponível/preenchido, encerramento automático ao lotar
- [ ] Datas, local e observações exibidos na página pública
- [ ] Formulário só com campanha aberta e vagas > 0
- [ ] Dados pessoais pré-preenchidos + campos clínicos do animal
- [ ] Protocolo único, múltiplos animais por solicitação
- [ ] Status completo + histórico + acompanhamento do cidadão
- [ ] E-mails nos eventos definidos
- [ ] Comprovante PDF imediato + reimpressão
- [ ] SAMA: gestão, agendamento, exports, campanhas anteriores com indicadores
- [ ] Usuário comum bloqueado em API e UI admin
- [ ] Auditoria em ações sensíveis
- [ ] Toggle legado e app Flutter continuam funcionando

---

## 14. Decisões em aberto

1. **Vagas esgotadas:** rejeitar envio ou fila de espera automática?
2. **Admin municipal:** continua sem ver solicitações (só `sama`)?
3. **Uma solicitação por campanha por usuário** ou múltiplas permitidas?
4. **PDF server-side** (`pdfkit`) vs client-side (`jsPDF`) para comprovante?
5. **MVP mobile** na mesma entrega ou só web?

---

## 15. Arquivos previstos (novos/alterados)

**Novos**
- `backend/models/CastrationCampaign.js`
- `backend/models/CastrationRequest.js`
- `backend/controllers/CastrationCampaignController.js`
- `backend/controllers/CastrationRequestController.js`
- `backend/helpers/castration-request-service.js`
- `backend/helpers/castration-protocol.js`
- `backend/helpers/castration-notifier.js`
- `backend/helpers/castration-receipt-pdf.js`
- `backend/routes/CastrationCampaignRoutes.js`
- `backend/routes/CastrationRequestRoutes.js`
- `backend/public/sama/patch-castration-module.js`
- `backend/__tests__/integration/castration-requests.test.js`
- `docs/PLANO-CASTRACAO-CAMPANHAS.md` (este arquivo)

**Alterados**
- `backend/server.js` (montar rotas)
- `backend/controllers/SystemSettingController.js` (delegar/sync campanha)
- `backend/models/User.js` (campos opcionais)
- `backend/public/sama/index.html` (script patch)
- `docs/PLANO_IMPLEMENTACAO_GARCA_PET.md` (referência cruzada)

**Sem alterar**
- Bundle `main.014d197f.js` (minificado)
- Fluxos adoção/árvores/pets existentes

---

*Última atualização: incorpora requisitos de vagas, status, notificações, campanha, campos clínicos, comprovante e histórico.*
