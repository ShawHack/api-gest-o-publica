const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
} = require('../helpers/test-harness');
const VotingServidor = require('../../models/VotingServidor');
const AuditLog = require('../../models/AuditLog');
const {
  computeCpfHash,
  computeServidorIdentityHash,
  cpfLast4,
} = require('../../helpers/voting-identity-hash');

const VALID_CPF = '39053344705';

async function waitForAudit(query, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    const doc = await AuditLog.findOne(query).sort({ createdAt: -1 }).lean();
    if (doc) return doc;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

async function seedServidor() {
  return VotingServidor.create({
    cpfHash: computeCpfHash(VALID_CPF),
    cpfLast4: cpfLast4(VALID_CPF),
    matriculaHash: computeServidorIdentityHash(VALID_CPF, 'MAT-100'),
    password: 'hash',
    nome: 'Servidor Voto',
  });
}

describe('votação — auth', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  test('POST /votacao/auth/login CPF inválido retorna 422', async () => {
    const res = await request(getApp())
      .post('/votacao/auth/login')
      .send({ cpf: '11111111111' });
    expect(res.status).toBe(422);
  });

  test('POST /votacao/auth/login CPF não cadastrado retorna 401', async () => {
    const res = await request(getApp())
      .post('/votacao/auth/login')
      .send({ cpf: '52998224725' });
    expect(res.status).toBe(401);
  });

  test('requisição do app mobile com falha gera app.request_failed', async () => {
    const res = await request(getApp())
      .post('/votacao/auth/login')
      .set('X-Client-App', 'prefeitura_app')
      .set('X-Client-Platform', 'android')
      .set('X-Client-Module', 'votacao')
      .set('X-Screen-Id', 'votacao/login')
      .send({ cpf: '52998224725' });
    expect(res.status).toBe(401);
    const audit = await waitForAudit({ action: 'app.request_failed', module: 'votacao' });
    expect(audit).toBeTruthy();
    expect(audit.client?.app).toBe('prefeitura_app');
  });

  test('login e refresh rotacionam tokens', async () => {
    await seedServidor();
    const login = await request(getApp())
      .post('/votacao/auth/login')
      .send({ cpf: VALID_CPF });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();
    expect(login.body.refreshToken).toBeTruthy();

    const refresh = await request(getApp())
      .post('/votacao/auth/refresh')
      .send({ refreshToken: login.body.refreshToken });
    expect(refresh.status).toBe(200);
    expect(refresh.body.accessToken).toBeTruthy();
    expect(refresh.body.refreshToken).not.toBe(login.body.refreshToken);

    const auditLogin = await waitForAudit({ action: 'votacao.auth.login_success' });
    expect(auditLogin).toBeTruthy();
    expect(auditLogin.module).toBe('votacao');
    expect(auditLogin.eventType).toBe('LOGIN');

    const auditRefresh = await waitForAudit({ action: 'votacao.auth.refresh_success' });
    expect(auditRefresh).toBeTruthy();
  });
});
