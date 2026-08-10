const request = require('supertest');
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness');
const Votation = require('../../models/Votation');
const VotingCategory = require('../../models/VotingCategory');
const VotingCandidate = require('../../models/VotingCandidate');
const VotingServidor = require('../../models/VotingServidor');
const Vote = require('../../models/Vote');
const VoterParticipation = require('../../models/VoterParticipation');
const {
  computeCpfHash,
  computeServidorIdentityHash,
  cpfLast4,
} = require('../../helpers/voting-identity-hash');

const CPF_A = '39053344705';
const CPF_B = '52998224725';
const MAT_A = 'MAT-100';
const MAT_B = 'MAT-200';

async function seedVoter(cpf, matricula, nome) {
  return VotingServidor.create({
    matricula,
    cpfHash: computeCpfHash(cpf),
    cpfLast4: cpfLast4(cpf),
    matriculaHash: computeServidorIdentityHash(cpf, matricula),
    password: 'hash',
    nome,
    active: true,
  });
}

async function loginVoter(cpf, nome) {
  const res = await request(getApp())
    .post('/votacao/auth/login')
    .send({ cpf, nome });
  return res.body.accessToken;
}

async function createActiveElection() {
  const now = Date.now();
  const vot = await Votation.create({
    title: 'Eleição Teste',
    description: 'Pleito integração',
    startDate: new Date(now - 3600000),
    endDate: new Date(now + 3600000),
    status: 'active',
    allowPartialResults: true,
  });
  const cat1 = await VotingCategory.create({ votationId: vot._id, name: 'Cargo A', order: 1 });
  const cat2 = await VotingCategory.create({ votationId: vot._id, name: 'Cargo B', order: 2 });
  const c1 = await VotingCandidate.create({
    votationId: vot._id,
    categoryId: cat1._id,
    number: 10,
    name: 'Candidato Um',
  });
  const c2 = await VotingCandidate.create({
    votationId: vot._id,
    categoryId: cat2._id,
    number: 20,
    name: 'Candidato Dois',
  });
  return { vot, cat1, cat2, c1, c2 };
}

describe('votação — pleito multi-cargo (v2)', () => {
  beforeAll(() => setupIntegrationTest());
  afterAll(() => teardownIntegrationTest());

  test('login aceita nome sem acento quando cadastro tem acento', async () => {
    const CPF = '28918394802';
    await VotingServidor.create({
      matricula: '039832',
      cpfHash: computeCpfHash(CPF),
      cpfLast4: cpfLast4(CPF),
      matriculaHash: computeServidorIdentityHash(CPF, '039832'),
      password: 'hash',
      nome: 'Saulo Vieira',
      active: true,
    });

    const res = await request(getApp())
      .post('/votacao/auth/login')
      .send({ cpf: '289.183.948-02', nome: 'saulo vieira' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  test('login exige nome + CPF corretos', async () => {
    await seedVoter(CPF_A, MAT_A, 'Eleitor A');
    const bad = await request(getApp())
      .post('/votacao/auth/login')
      .send({ cpf: CPF_A, nome: 'Nome Errado' });
    expect(bad.status).toBe(401);

    const ok = await request(getApp())
      .post('/votacao/auth/login')
      .send({ cpf: CPF_A, nome: 'Eleitor A' });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeTruthy();
  });

  test('fluxo completo: cédula, branco, nulo, apuração e sigilo', async () => {
    await seedVoter(CPF_A, MAT_A, 'Eleitor A');
    await seedVoter(CPF_B, MAT_B, 'Eleitor B');
    const { vot, cat1, cat2, c1, c2 } = await createActiveElection();

    const tokenA = await loginVoter(CPF_A, 'Eleitor A');
    const tokenB = await loginVoter(CPF_B, 'Eleitor B');

    const ballotA = await request(getApp())
      .get(`/votacao/votacoes/${vot._id}/ballot`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(ballotA.status).toBe(200);
    expect(ballotA.body.ballot).toHaveLength(2);

    const submitA = await request(getApp())
      .post(`/votacao/votacoes/${vot._id}/ballot`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        choices: [
          { categoryId: String(cat1._id), voteType: 'candidate', candidateId: String(c1._id) },
          { categoryId: String(cat2._id), voteType: 'blank' },
        ],
      });
    expect(submitA.status).toBe(201);

    const submitB = await request(getApp())
      .post(`/votacao/votacoes/${vot._id}/ballot`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        choices: [
          { categoryId: String(cat1._id), voteType: 'null' },
          { categoryId: String(cat2._id), voteType: 'candidate', candidateId: String(c2._id) },
        ],
      });
    expect(submitB.status).toBe(201);

    const dup = await request(getApp())
      .post(`/votacao/votacoes/${vot._id}/ballot`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        choices: [
          { categoryId: String(cat1._id), voteType: 'candidate', candidateId: String(c1._id) },
          { categoryId: String(cat2._id), voteType: 'blank' },
        ],
      });
    expect(dup.status).toBe(409);

    const votes = await Vote.find({ votationId: vot._id, ballotVersion: 2 }).lean();
    expect(votes).toHaveLength(4);
    votes.forEach((v) => {
      expect(v.userHash).toBeFalsy();
    });

    const participation = await VoterParticipation.countDocuments({ votationId: vot._id });
    expect(participation).toBe(2);

    const results = await request(getApp()).get(`/votacao/votacoes/${vot._id}/resultado-v2`);
    expect(results.status).toBe(200);
    expect(results.body.participants).toBe(2);
    const catARes = results.body.categories.find((c) => c.name === 'Cargo A');
    expect(catARes.candidates[0].votes).toBe(1);
    expect(catARes.null).toBe(1);
    const catBRes = results.body.categories.find((c) => c.name === 'Cargo B');
    expect(catBRes.blank).toBe(1);
    expect(catBRes.candidates[0].votes).toBe(1);
  });

  test('admin-votacao acessa painel', async () => {
    const admin = await createVerifiedUser({ email: 'votacao-admin@test.local', role: 'admin-votacao' });
    const adminToken = bearerToken(admin);
    const create = await request(getApp())
      .post('/votacao/admin/votacoes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Pleito RH',
        startDate: new Date(Date.now() - 1000),
        endDate: new Date(Date.now() + 86400000),
      });
    expect(create.status).toBe(201);
  });

  test('admin: categorias, candidatos e export sem user_hash', async () => {
    const admin = await createVerifiedUser({ email: 'admin-voto@test.local', role: 'admin' });
    const adminToken = bearerToken(admin);
    const now = Date.now();
    const create = await request(getApp())
      .post('/votacao/admin/votacoes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Admin Pleito',
        startDate: new Date(now - 1000),
        endDate: new Date(now + 86400000),
      });
    expect(create.status).toBe(201);
    const votId = create.body.votation._id;

    const cat = await request(getApp())
      .post(`/votacao/admin/votacoes/${votId}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Diretor', order: 1 });
    expect(cat.status).toBe(201);

    const cand = await request(getApp())
      .post(`/votacao/admin/votacoes/${votId}/candidates-v2`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoryId: cat.body.category._id, number: 1, name: 'Ana' });
    expect(cand.status).toBe(201);

    const exportRes = await request(getApp())
      .get(`/votacao/admin/votacoes/${votId}/export-votos-v2.csv`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(exportRes.status).toBe(200);
    expect(exportRes.text).not.toContain('user_hash');
    expect(exportRes.text).toContain('vote_type');
  });

  test('fora do período bloqueia voto', async () => {
    await seedVoter(CPF_A, MAT_A, 'Eleitor A');
    const now = Date.now();
    const vot = await Votation.create({
      title: 'Encerrado',
      startDate: new Date(now - 7200000),
      endDate: new Date(now - 3600000),
      status: 'active',
    });
    const cat = await VotingCategory.create({ votationId: vot._id, name: 'X' });
    const token = await loginVoter(CPF_A, 'Eleitor A');
    const res = await request(getApp())
      .get(`/votacao/votacoes/${vot._id}/ballot`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
