const request = require('supertest')
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness')
const Votation = require('../../models/Votation')
const VotingPleitoMembership = require('../../models/VotingPleitoMembership')
const User = require('../../models/User')
const AuditLog = require('../../models/AuditLog')

async function waitForAudit(query, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    const doc = await AuditLog.findOne(query).sort({ createdAt: -1 }).lean()
    if (doc) return doc
    await new Promise((r) => setTimeout(r, 50))
  }
  return null
}

async function createPleito(adminToken, title) {
  const now = Date.now()
  const res = await request(getApp())
    .post('/votacao/admin/votacoes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title,
      startDate: new Date(now - 1000),
      endDate: new Date(now + 86400000),
      status: 'draft',
    })
  expect(res.status).toBe(201)
  return res.body.votation
}

describe('votação — auditor por pleito', () => {
  beforeAll(() => setupIntegrationTest())
  afterAll(() => teardownIntegrationTest())

  test('gestor designa auditor com justificativa e senha temporária única', async () => {
    const admin = await createVerifiedUser({
      email: 'semit-gestor-aud@test.local',
      role: 'admin-votacao',
      name: 'Gestor SEMIT',
    })
    const adminToken = bearerToken(admin)
    const pleito = await createPleito(adminToken, 'Pleito CIPAA 2026')

    const bad = await request(getApp())
      .post(`/votacao/admin/votacoes/${pleito._id}/auditores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'auditor.novo@test.local',
        name: 'Auditor Novo',
        justification: 'curta',
      })
    expect(bad.status).toBe(422)

    const invite = await request(getApp())
      .post(`/votacao/admin/votacoes/${pleito._id}/auditores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'auditor.novo@test.local',
        name: 'Auditor Novo',
        phone: '16988887777',
        justification:
          'Designação formal para fiscalização do pleito CIPAA 2026, conforme determinação da autoridade competente.',
      })
    expect(invite.status).toBe(201)
    expect(invite.body.createdUser).toBe(true)
    expect(invite.body.temporaryPassword).toBeTruthy()
    expect(invite.body.membership.status).toBe('active')
    expect(invite.body.membership.justification.length).toBeGreaterThanOrEqual(20)

    const user = await User.findOne({ email: 'auditor.novo@test.local' })
    expect(user).toBeTruthy()
    expect(user.role).toBe('votacao_auditor')

    const audit = await waitForAudit({ action: 'votacao.admin.auditor_invite' })
    expect(audit).toBeTruthy()
    expect(String(audit.resourceId)).toBe(String(invite.body.membership.id))
  })

  test('auditor só lista e lê pleitos vinculados; escrita e outro pleito são 403', async () => {
    const admin = await createVerifiedUser({
      email: 'semit-gestor-scope@test.local',
      role: 'admin-votacao',
    })
    const adminToken = bearerToken(admin)
    const pleitoA = await createPleito(adminToken, 'Pleito Escopo A')
    const pleitoB = await createPleito(adminToken, 'Pleito Escopo B')

    const invite = await request(getApp())
      .post(`/votacao/admin/votacoes/${pleitoA._id}/auditores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'auditor.escopo@test.local',
        name: 'Auditor Escopo',
        justification:
          'Vínculo exclusivo ao pleito A para teste de segregação de funções e escopo.',
      })
    expect(invite.status).toBe(201)

    const auditor = await User.findOne({ email: 'auditor.escopo@test.local' })
    const audToken = bearerToken(auditor)

    const me = await request(getApp())
      .get('/votacao/admin/me')
      .set('Authorization', `Bearer ${audToken}`)
    expect(me.status).toBe(200)
    expect(me.body.access.globalAdmin).toBe(false)
    expect(me.body.access.canWrite).toBe(false)
    expect(me.body.access.pleitoIds).toEqual([String(pleitoA._id)])

    const list = await request(getApp())
      .get('/votacao/admin/votacoes')
      .set('Authorization', `Bearer ${audToken}`)
    expect(list.status).toBe(200)
    expect(list.body.votations).toHaveLength(1)
    expect(String(list.body.votations[0]._id)).toBe(String(pleitoA._id))
    expect(list.body.access.canWrite).toBe(false)

    const readOk = await request(getApp())
      .get(`/votacao/admin/votacoes/${pleitoA._id}`)
      .set('Authorization', `Bearer ${audToken}`)
    expect(readOk.status).toBe(200)

    const detailOk = await request(getApp())
      .get(`/votacao/admin/votacoes/${pleitoA._id}/detail`)
      .set('Authorization', `Bearer ${audToken}`)
    expect(detailOk.status).toBe(200)

    const categoriesOk = await request(getApp())
      .get(`/votacao/admin/votacoes/${pleitoA._id}/categories`)
      .set('Authorization', `Bearer ${audToken}`)
    expect(categoriesOk.status).toBe(200)

    const tallyOk = await request(getApp())
      .get(`/votacao/admin/votacoes/${pleitoA._id}/resultado-v2`)
      .set('Authorization', `Bearer ${audToken}`)
    expect(tallyOk.status).toBe(200)

    const readDenied = await request(getApp())
      .get(`/votacao/admin/votacoes/${pleitoB._id}`)
      .set('Authorization', `Bearer ${audToken}`)
    expect(readDenied.status).toBe(403)

    const writeDenied = await request(getApp())
      .patch(`/votacao/admin/votacoes/${pleitoA._id}`)
      .set('Authorization', `Bearer ${audToken}`)
      .send({ title: 'Tentativa de alteração' })
    expect(writeDenied.status).toBe(403)

    const createDenied = await request(getApp())
      .post('/votacao/admin/votacoes')
      .set('Authorization', `Bearer ${audToken}`)
      .send({
        title: 'Não deveria criar',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      })
    expect(createDenied.status).toBe(403)

    const eleitoresDenied = await request(getApp())
      .get('/votacao/admin/servidores')
      .set('Authorization', `Bearer ${audToken}`)
    expect(eleitoresDenied.status).toBe(403)

    const exportDenied = await request(getApp())
      .get(`/votacao/admin/votacoes/${pleitoA._id}/export-comparecimento.csv`)
      .set('Authorization', `Bearer ${audToken}`)
    expect(exportDenied.status).toBe(403)

    const inviteDenied = await request(getApp())
      .post(`/votacao/admin/votacoes/${pleitoA._id}/auditores`)
      .set('Authorization', `Bearer ${audToken}`)
      .send({
        email: 'outro@test.local',
        name: 'Outro',
        justification: 'Auditor não pode designar outro auditor neste pleito institucional.',
      })
    expect(inviteDenied.status).toBe(403)

    const dash = await request(getApp())
      .get('/votacao/admin/dashboard')
      .set('Authorization', `Bearer ${audToken}`)
    expect(dash.status).toBe(200)
    expect(dash.body.totalVotations).toBe(1)
    expect(dash.body.servidoresCadastrados).toBeNull()
  })

  test('revogação encerra acesso e exige motivo; reativação preserva histórico', async () => {
    const admin = await createVerifiedUser({
      email: 'semit-gestor-rev@test.local',
      role: 'admin',
    })
    const adminToken = bearerToken(admin)
    const pleito = await createPleito(adminToken, 'Pleito Revogação')

    const invite = await request(getApp())
      .post(`/votacao/admin/votacoes/${pleito._id}/auditores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'auditor.revogar@test.local',
        name: 'Auditor Revogar',
        justification:
          'Designação inicial para posterior teste de revogação com trilha completa.',
      })
    expect(invite.status).toBe(201)
    const membershipId = invite.body.membership.id

    const auditor = await User.findOne({ email: 'auditor.revogar@test.local' })
    const audToken = bearerToken(auditor)

    const shortReason = await request(getApp())
      .patch(`/votacao/admin/votacoes/${pleito._id}/auditores/${membershipId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ revokeReason: 'fim' })
    expect(shortReason.status).toBe(422)

    const revoke = await request(getApp())
      .patch(`/votacao/admin/votacoes/${pleito._id}/auditores/${membershipId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        revokeReason: 'Encerramento do mandato de fiscalização após apuração final.',
      })
    expect(revoke.status).toBe(200)
    expect(revoke.body.membership.status).toBe('revoked')

    const afterRevoke = await request(getApp())
      .get(`/votacao/admin/votacoes/${pleito._id}`)
      .set('Authorization', `Bearer ${audToken}`)
    expect(afterRevoke.status).toBe(403)

    const staffDenied = await request(getApp())
      .get('/votacao/admin/me')
      .set('Authorization', `Bearer ${audToken}`)
    expect(staffDenied.status).toBe(403)

    const reinvite = await request(getApp())
      .post(`/votacao/admin/votacoes/${pleito._id}/auditores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'auditor.revogar@test.local',
        name: 'Auditor Revogar',
        justification:
          'Reativação formal do vínculo de auditor após nova determinação institucional.',
      })
    expect(reinvite.status).toBe(201)
    expect(reinvite.body.createdUser).toBe(false)
    expect(reinvite.body.temporaryPassword).toBeNull()
    expect(reinvite.body.membership.status).toBe('active')

    const memberships = await VotingPleitoMembership.find({
      votationId: pleito._id,
      userId: auditor._id,
    })
    expect(memberships).toHaveLength(1)
    expect(memberships[0].status).toBe('active')
    expect(memberships[0].justification).toContain('Reativação formal')

    const list = await request(getApp())
      .get(`/votacao/admin/votacoes/${pleito._id}/auditores`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(list.status).toBe(200)
    expect(list.body.items).toHaveLength(1)
    expect(list.body.items[0].status).toBe('active')
  })

  test('gestor redefine a senha do auditor com justificativa e exibição única', async () => {
    const admin = await createVerifiedUser({
      email: 'semit-gestor-reset@test.local',
      role: 'admin-votacao',
    })
    const adminToken = bearerToken(admin)
    const pleito = await createPleito(adminToken, 'Pleito Redefinição')
    const invite = await request(getApp())
      .post(`/votacao/admin/votacoes/${pleito._id}/auditores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'auditor.reset@test.local',
        name: 'Auditor Reset',
        justification: 'Designação formal para validar a redefinição segura de senha.',
      })
    expect(invite.status).toBe(201)

    const shortReason = await request(getApp())
      .post(`/votacao/admin/votacoes/${pleito._id}/auditores/${invite.body.membership.id}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'esqueci' })
    expect(shortReason.status).toBe(422)

    const reset = await request(getApp())
      .post(`/votacao/admin/votacoes/${pleito._id}/auditores/${invite.body.membership.id}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ justification: 'Solicitação formal do auditor por perda da credencial anterior.' })
    expect(reset.status).toBe(200)
    expect(reset.body.temporaryPassword).toBeTruthy()
    expect(reset.body.temporaryPassword).not.toBe(invite.body.temporaryPassword)

    const user = await User.findOne({ email: 'auditor.reset@test.local' })
    expect(await require('bcrypt').compare(reset.body.temporaryPassword, user.password)).toBe(true)
    expect(await require('bcrypt').compare(invite.body.temporaryPassword, user.password)).toBe(false)
    const audit = await waitForAudit({ action: 'votacao.admin.auditor_password_reset' })
    expect(audit).toBeTruthy()
  })

  test('não rebaixa admin-votacao nem altera perfil incompatível', async () => {
    const admin = await createVerifiedUser({
      email: 'semit-gestor-roles@test.local',
      role: 'admin-votacao',
    })
    const adminToken = bearerToken(admin)
    const pleito = await createPleito(adminToken, 'Pleito Papéis')

    const peer = await createVerifiedUser({
      email: 'outro-gestor@test.local',
      role: 'admin-votacao',
      name: 'Outro Gestor',
    })
    const inviteAdmin = await request(getApp())
      .post(`/votacao/admin/votacoes/${pleito._id}/auditores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: peer.email,
        justification:
          'Registro formal de designação de gestor como auditor do pleito para rastreabilidade.',
      })
    expect(inviteAdmin.status).toBe(201)
    const peerReload = await User.findById(peer._id)
    expect(peerReload.role).toBe('admin-votacao')

    const iluminacao = await createVerifiedUser({
      email: 'ilu-admin@test.local',
      role: 'iluminacao_admin',
      name: 'Admin Iluminação',
    })
    const refuse = await request(getApp())
      .post(`/votacao/admin/votacoes/${pleito._id}/auditores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: iluminacao.email,
        justification:
          'Tentativa indevida de converter perfil de outro módulo em auditor de votação.',
      })
    expect(refuse.status).toBe(422)
    expect(refuse.body.currentRole).toBe('iluminacao_admin')
    const iluReload = await User.findById(iluminacao._id)
    expect(iluReload.role).toBe('iluminacao_admin')
  })

  test('usuário sem vínculo e sem papel de votação não entra no módulo', async () => {
    const stranger = await createVerifiedUser({
      email: 'sem-vinculo@test.local',
      role: 'usuario',
    })
    const token = bearerToken(stranger)
    const res = await request(getApp())
      .get('/votacao/admin/votacoes')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)

    await Votation.create({
      title: 'Orfão',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      status: 'draft',
    })
  })
})
