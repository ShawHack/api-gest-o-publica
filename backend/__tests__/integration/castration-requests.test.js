const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness');

jest.mock('../../helpers/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue({ ok: true }),
}));

function sampleAnimal(overrides = {}) {
  return {
    species: 'cachorro',
    name: 'Rex',
    birthYearOrAge: '3 anos',
    weightKg: 12,
    breed: 'SRD',
    sex: 'macho',
    previouslyCastrated: false,
    isCommunityAnimal: false,
    hasGuardian: true,
    hasDiseases: false,
    onContinuousMedication: false,
    isAggressive: false,
    ...overrides,
  };
}

async function createOpenCampaign(samaUser, maxAnimals = 5) {
  const token = bearerToken(samaUser);
  const createRes = await request(getApp())
    .post('/castration-campaigns')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Campanha Teste 2026',
      year: 2026,
      maxAnimals,
      surgeryDate: '2026-08-15',
      location: 'Centro Veterinário',
    });
  expect(createRes.status).toBe(201);
  const openRes = await request(getApp())
    .post(`/castration-campaigns/${createRes.body.campaign.id}/open`)
    .set('Authorization', `Bearer ${token}`);
  expect(openRes.status).toBe(200);
  return openRes.body.campaign;
}

describe('castração — campanhas e solicitações', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  test('GET /castration-campaigns/active é público', async () => {
    const res = await request(getApp()).get('/castration-campaigns/active');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('acceptsRequests');
  });

  test('usuário comum não acessa listagem admin de campanhas', async () => {
    const user = await createVerifiedUser({ email: 'cast-user@test.local' });
    const res = await request(getApp())
      .get('/castration-campaigns')
      .set('Authorization', `Bearer ${bearerToken(user)}`);
    expect(res.status).toBe(403);
  });

  test('membro SAMA legado (isSamaMember) acessa listagem de solicitações', async () => {
    const User = require('../../models/User');
    const bcrypt = require('bcrypt');
    const legacySama = await User.create({
      name: 'SAMA Legado',
      email: 'cast-legacy-sama@test.local',
      password: await bcrypt.hash('Senha@123', 10),
      phone: '16999990002',
      role: 'usuario',
      isSamaMember: true,
      emailVerified: true,
    });
    const res = await request(getApp())
      .get('/castration-requests')
      .set('Authorization', `Bearer ${bearerToken(legacySama)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
  });

  test('fluxo completo: campanha aberta → solicitação → protocolo', async () => {
    const sama = await createVerifiedUser({ email: 'cast-sama@test.local', role: 'sama' });
    const citizen = await createVerifiedUser({
      email: 'cast-citizen@test.local',
      name: 'Maria Cidadã',
    });
    const campaign = await createOpenCampaign(sama, 3);

    const createReq = await request(getApp())
      .post('/castration-requests')
      .set('Authorization', `Bearer ${bearerToken(citizen)}`)
      .send({ animals: [sampleAnimal()] });

    expect(createReq.status).toBe(201);
    expect(createReq.body.request.protocol).toMatch(/^CAST-2026-\d{6}$/);
    expect(createReq.body.request.status).toBe('pendente');

    const activeRes = await request(getApp()).get('/castration-campaigns/active');
    expect(activeRes.body.campaign.reservedAnimals).toBe(1);
    expect(activeRes.body.campaign.slotsAvailable).toBe(2);

    const mineRes = await request(getApp())
      .get('/castration-requests/mine')
      .set('Authorization', `Bearer ${bearerToken(citizen)}`);
    expect(mineRes.status).toBe(200);
    expect(mineRes.body.items.length).toBe(1);

    const adminList = await request(getApp())
      .get('/castration-requests')
      .set('Authorization', `Bearer ${bearerToken(sama)}`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.total).toBe(1);

    const statsRes = await request(getApp())
      .get(`/castration-campaigns/${campaign.id}/stats`)
      .set('Authorization', `Bearer ${bearerToken(sama)}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.totalRequests).toBe(1);
    expect(statsRes.body.animalsRealized).toBe(0);
  });

  test('esgota vagas e encerra campanha automaticamente', async () => {
    const sama = await createVerifiedUser({ email: 'cast-full-sama@test.local', role: 'sama' });
    const citizen = await createVerifiedUser({ email: 'cast-full-user@test.local' });
    await createOpenCampaign(sama, 1);

    const ok = await request(getApp())
      .post('/castration-requests')
      .set('Authorization', `Bearer ${bearerToken(citizen)}`)
      .send({ animals: [sampleAnimal()] });
    expect(ok.status).toBe(201);

    const active = await request(getApp()).get('/castration-campaigns/active');
    expect(active.body.campaign.status).toBe('full');
    expect(active.body.acceptsRequests).toBe(false);

    const overflow = await request(getApp())
      .post('/castration-requests')
      .set('Authorization', `Bearer ${bearerToken(citizen)}`)
      .send({ animals: [sampleAnimal({ name: 'Luna' })] });
    expect(overflow.status).toBe(403);
  });

  test('SAMA atualiza status da solicitação', async () => {
    const sama = await createVerifiedUser({ email: 'cast-status-sama@test.local', role: 'sama' });
    const citizen = await createVerifiedUser({ email: 'cast-status-user@test.local' });
    await createOpenCampaign(sama, 5);

    const created = await request(getApp())
      .post('/castration-requests')
      .set('Authorization', `Bearer ${bearerToken(citizen)}`)
      .send({ animals: [sampleAnimal()] });
    const id = created.body.request.id;

    const patch = await request(getApp())
      .patch(`/castration-requests/${id}/status`)
      .set('Authorization', `Bearer ${bearerToken(sama)}`)
      .send({ status: 'em_analise', note: 'Em triagem' });
    expect(patch.status).toBe(200);
    expect(patch.body.request.status).toBe('em_analise');
  });

  test('legado aberto sem campanha cria campanha padrão ao consultar status', async () => {
    const SystemSetting = require('../../models/SystemSetting');
    const CastrationCampaign = require('../../models/CastrationCampaign');
    await SystemSetting.findOneAndUpdate(
      { key: 'castration_closed' },
      { value: false },
      { upsert: true }
    );
    await CastrationCampaign.deleteMany({});

    const res = await request(getApp()).get('/castration-campaigns/active');
    expect(res.status).toBe(200);
    expect(res.body.legacyClosed).toBe(false);
    expect(res.body.campaign).toBeTruthy();
    expect(res.body.campaign.status).toBe('open');
    expect(res.body.acceptsRequests).toBe(true);
  });

  test('GET /v1/castracao/status inclui campanha ativa', async () => {
    const sama = await createVerifiedUser({ email: 'cast-compat-sama@test.local', role: 'sama' });
    await createOpenCampaign(sama, 10);

    const res = await request(getApp()).get('/v1/castracao/status');
    expect(res.status).toBe(200);
    expect(res.body.closed).toBe(false);
    expect(res.body.campaign).toBeTruthy();
    expect(res.body.campaign.acceptsRequests).toBe(true);
  });
});
