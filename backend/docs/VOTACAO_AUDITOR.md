# Auditor por pleito (módulo Votação)

## Objetivo

Permitir que a SEMIT designe **auditores** com acesso **somente leitura** a um ou mais pleitos, com vínculo formal, justificativa institucional e trilha de auditoria — sem capacidade de alterar configuração, candidatos, status ou base de eleitores.

## Papéis

| Papel | Escopo | Escrita |
|-------|--------|---------|
| `admin` / `admin-votacao` | Todos os pleitos | Sim |
| `votacao_auditor` | Apenas pleitos com membership `active` | Não |

A fonte de verdade do escopo do auditor é o modelo `VotingPleitoMembership` (`votationId` + `userId` + `role: auditor` + `status`).

## Fluxo operacional

1. Gestor SEMIT abre o pleito → **Equipe / Auditores**.
2. Informa e-mail, nome (se usuário novo) e **justificativa** (≥ 20 caracteres).
3. Se o usuário não existir, o sistema cria conta `votacao_auditor` e exibe **senha temporária uma única vez**.
4. Contas com outros perfis institucionais (ex.: `iluminacao_admin`) **não** são convertidas — use e-mail dedicado.
5. Gestores `admin` / `admin-votacao` podem ser vinculados sem rebaixamento de papel.
6. Revogação exige motivo (≥ 10 caracteres) e encerra o acesso imediatamente.

## Endpoints

- `GET /api/votacao/admin/me` — sessão e escopo
- `GET|POST /api/votacao/admin/votacoes/:id/auditores`
- `PATCH /api/votacao/admin/votacoes/:id/auditores/:membershipId` — revogar

Leitura de pleito: `requireVotingPleitoRead`. Mutações: `requireVotingPleitoWrite` (somente gestores globais).

## UI

Admin em `/votacao/admin`. Auditores veem badge **somente leitura**, lista filtrada de pleitos e menus sem ações de escrita.
