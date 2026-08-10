const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness');
const Votation = require('../../models/Votation');
const VotingServidor = require('../../models/VotingServidor');
const VoterParticipation = require('../../models/VoterParticipation');
const {
  computeCpfHash,
  computeServidorIdentityHash,
  cpfLast4,
} = require('../../helpers/voting-identity-hash');

const CPF = '39053344705';
const SLUG = 'eleicao-teste-landing';

async function seedVoter() {
  const existing = await VotingServidor.findOne({ cpfHash: computeCpfHash(CPF) });
  if (existing) return existing;
  return VotingServidor.create({
    matricula: 'MAT-LANDING',
    cpfHash: computeCpfHash(CPF),
    cpfLast4: cpfLast4(CPF),
    matriculaHash: computeServidorIdentityHash(CPF, 'MAT-LANDING'),
    password: 'hash',
    nome: 'Eleitor Landing',
    active: true,
  });
}

async function seedActivePleito() {
  const existing = await Votation.findOne({ slug: SLUG });
  if (existing) return existing;
  const now = Date.now();
  return Votation.create({
    title: 'Eleição Teste Landing',
    slug: SLUG,
    description: 'Descrição institucional',
    voterInstructions: 'Leia com atenção antes de votar.',
    themeColor: '#0f766e',
    startDate: new Date(now - 3600000),
    endDate: new Date(now + 3600000),
    status: 'active',
  });
}

describe('votação — landing page por pleito', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  test('criar pleito gera slug e landing pública', async () => {
    const admin = await createVerifiedUser({ email: 'landing-admin@test.local', role: 'admin-votacao' });
    const adminToken = bearerToken(admin);
    const now = Date.now();
    const create = await request(getApp())
      .post('/votacao/admin/votacoes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Pleito Com Slug Automático',
        startDate: new Date(now + 86400000).toISOString(),
        endDate: new Date(now + 172800000).toISOString(),
        status: 'draft',
      });
    expect(create.status).toBe(201);
    expect(create.body.votation.slug).toBeTruthy();
    expect(create.body.landingUrl).toMatch(/^\/votacao\/p\//);
  });

  test('GET landing retorna dados institucionais', async () => {
    await seedActivePleito();
    const res = await request(getApp()).get(`/votacao/pleitos/${SLUG}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toContain('Landing');
    expect(res.body.voterInstructions).toContain('atenção');
    expect(res.body.votingOpen).toBe(true);
    expect(res.body.landingUrl).toBe(`/votacao/p/${SLUG}`);
  });

  test('unlock com CPF inválido retorna 422', async () => {
    await seedActivePleito();
    const res = await request(getApp())
      .post(`/votacao/pleitos/${SLUG}/unlock`)
      .send({ cpf: '11111111111' });
    expect(res.status).toBe(422);
    expect(res.body.reason).toBe('invalid_cpf');
  });

  test('unlock com CPF não habilitado retorna 401', async () => {
    await seedActivePleito();
    const res = await request(getApp())
      .post(`/votacao/pleitos/${SLUG}/unlock`)
      .send({ cpf: '52998224725' });
    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('not_eligible');
  });

  test('unlock com CPF válido libera sessão', async () => {
    await seedActivePleito();
    await seedVoter();
    const res = await request(getApp())
      .post(`/votacao/pleitos/${SLUG}/unlock`)
      .send({ cpf: CPF });
    expect(res.status).toBe(200);
    expect(res.body.unlocked).toBe(true);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.votationId).toBeTruthy();
  });

  test('unlock bloqueia eleitor que já votou', async () => {
    const vot = await seedActivePleito();
    const servidor = await seedVoter();
    await VoterParticipation.findOneAndUpdate(
      { votationId: vot._id, servidorId: servidor._id },
      { $set: { votedAt: new Date() } },
      { upsert: true }
    );

    const res = await request(getApp())
      .post(`/votacao/pleitos/${SLUG}/unlock`)
      .send({ cpf: CPF });
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('already_voted');
  });
});
