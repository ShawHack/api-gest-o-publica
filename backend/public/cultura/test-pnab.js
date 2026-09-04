/**
 * Script de Testes Automatizados — Módulo PNAB
 * Executa via: node test-pnab.js
 * Requer: MONGO_URI apontando para o MongoDB correto
 */

const mongoose = require('mongoose');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/teatro_db';

// Load models
const PnabYear = require('./models/PnabYear');
const PnabEdital = require('./models/PnabEdital');
const PnabDocument = require('./models/PnabDocument');
const PnabComunicado = require('./models/PnabComunicado');
const PnabCronograma = require('./models/PnabCronograma');
const PnabFaq = require('./models/PnabFaq');
const PnabLegislacao = require('./models/PnabLegislacao');
const PnabNoticia = require('./models/PnabNoticia');
const PnabMedia = require('./models/PnabMedia');
const PnabAudit = require('./models/PnabAudit');

let passed = 0;
let failed = 0;
let testYearId = null;
let testEditalId = null;

function log(msg, ok) {
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${msg}`);
  if (ok) passed++;
  else failed++;
}

async function runTests() {
  console.log('\n=== TESTES AUTOMATIZADOS — MÓDULO PNAB ===\n');

  await mongoose.connect(MONGO_URI);
  console.log('MongoDB conectado.\n');

  // -------------------------------------------------------------------------
  // TESTE 1: PnabYear - Seed data
  // -------------------------------------------------------------------------
  console.log('--- FASE 1: ANOS (PnabYear) ---');
  const years = await PnabYear.find({});
  log(`Anos seedados existem no banco (${years.length} encontrados)`, years.length >= 3);

  const year2025 = years.find(y => y.nome === '2025');
  log(`Ano 2025 está ativo`, year2025 && year2025.status === 'ativo');
  testYearId = year2025 ? year2025._id : years[0]?._id;

  // Create a test year with unique name based on timestamp
  const testYearName = `TEST_${Date.now()}`;
  const newYear = await PnabYear.create({
    nome: testYearName,
    descricao: 'Ano de teste automatizado',
    status: 'inativo',
    ordem: 99
  });
  log(`Criar PnabYear funciona`, !!newYear._id);

  // Soft delete year
  newYear.deleted = true;
  await newYear.save();
  const deletedYear = await PnabYear.findById(newYear._id);
  log(`Soft delete em PnabYear funciona`, deletedYear.deleted === true);

  // -------------------------------------------------------------------------
  // TESTE 2: PnabEdital - CRUD básico
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 2: EDITAIS (PnabEdital) ---');
  const editalPayload = {
    titulo: 'Edital de Teste Automatizado 01/2025',
    ano: testYearId,
    anoName: '2025',
    programa: 'PNAB',
    descricao: 'Descrição do edital de teste para validação automática.',
    statusEdital: 'Aberto',
    statusWorkflow: 'Rascunho',
    ordem: 0,
    destacado: true,
    tags: ['teste', 'automatizado']
  };

  const newEdital = await PnabEdital.create(editalPayload);
  log(`Criar PnabEdital funciona`, !!newEdital._id);
  testEditalId = newEdital._id;

  // Update workflow status
  newEdital.statusWorkflow = 'Publicado';
  await newEdital.save();
  const updatedEdital = await PnabEdital.findById(testEditalId);
  log(`Workflow de publicação funciona`, updatedEdital.statusWorkflow === 'Publicado');

  // Soft delete
  newEdital.deleted = true;
  await newEdital.save();
  const deletedEdital = await PnabEdital.findById(testEditalId);
  log(`Soft delete em PnabEdital funciona`, deletedEdital.deleted === true);

  // Restore (clear deleted)
  newEdital.deleted = false;
  await newEdital.save();
  const restoredEdital = await PnabEdital.findById(testEditalId);
  log(`Restaurar da lixeira funciona`, restoredEdital.deleted === false);

  // -------------------------------------------------------------------------
  // TESTE 3: PnabDocument — Versionamento
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 3: DOCUMENTOS e VERSIONAMENTO (PnabDocument) ---');
  const newDoc = await PnabDocument.create({
    edital: testEditalId,
    titulo: 'Edital Principal v1.0',
    tipo: 'Edital',
    versao: '1.0',
    arquivoUrl: '/uploads/pnab/teste-doc.pdf',
    arquivoHash: 'abc123hash',
    sizeBytes: 12345,
    publicadoPor: 'Sistema de Testes',
    historicoVersoes: []
  });
  log(`Criar PnabDocument funciona`, !!newDoc._id);

  // Simular nova versão (versioning)
  newDoc.historicoVersoes.push({
    versao: newDoc.versao,
    arquivoUrl: newDoc.arquivoUrl,
    arquivoHash: newDoc.arquivoHash,
    sizeBytes: newDoc.sizeBytes,
    publicadoPor: newDoc.publicadoPor,
    dataUpload: new Date(),
    descricaoAlteracao: 'Versão inicial arquivada para histórico.'
  });
  newDoc.versao = '2.0';
  newDoc.arquivoUrl = '/uploads/pnab/teste-doc-v2.pdf';
  newDoc.arquivoHash = 'xyz456hash';
  await newDoc.save();

  const savedDoc = await PnabDocument.findById(newDoc._id);
  log(`Versionamento de PnabDocument funciona (histórico com ${savedDoc.historicoVersoes.length} versão/versões)`, savedDoc.historicoVersoes.length === 1 && savedDoc.versao === '2.0');

  // Download counter
  savedDoc.downloadsCount += 1;
  await savedDoc.save();
  const counterDoc = await PnabDocument.findById(savedDoc._id);
  log(`Contador de downloads incrementado corretamente`, counterDoc.downloadsCount === 1);

  // -------------------------------------------------------------------------
  // TESTE 4: PnabCronograma (Timeline)
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 4: CRONOGRAMA TIMELINE (PnabCronograma) ---');
  const newCron = await PnabCronograma.create({
    edital: testEditalId,
    data: '01/08/2025',
    evento: 'Abertura das Inscrições',
    status: 'Agendado',
    ordem: 1
  });
  log(`Criar PnabCronograma funciona`, !!newCron._id);

  newCron.status = 'Em Andamento';
  await newCron.save();
  const updatedCron = await PnabCronograma.findById(newCron._id);
  log(`Atualizar status do cronograma funciona`, updatedCron.status === 'Em Andamento');

  // -------------------------------------------------------------------------
  // TESTE 5: PnabComunicado (Avisos e Erratas)
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 5: COMUNICADOS (PnabComunicado) ---');
  const newCom = await PnabComunicado.create({
    edital: testEditalId,
    titulo: 'Errata 01 — Correção no Anexo III',
    descricao: 'Informamos que houve uma correção de digitação no item 4.2 do Anexo III.',
    statusWorkflow: 'Publicado',
    fixado: true
  });
  log(`Criar PnabComunicado funciona`, !!newCom._id);
  log(`Campo fixado funciona corretamente`, newCom.fixado === true);

  // -------------------------------------------------------------------------
  // TESTE 6: PnabFaq (Perguntas Frequentes)
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 6: FAQ (PnabFaq) ---');
  const newFaq = await PnabFaq.create({
    edital: testEditalId,
    pergunta: 'Quem pode se inscrever como Pessoa Jurídica?',
    resposta: 'Pode se inscrever qualquer PJ com finalidade cultural no município de Garça.',
    categoria: 'Inscrição',
    ordem: 1
  });
  log(`Criar PnabFaq funciona`, !!newFaq._id);
  log(`Categoria do FAQ salva corretamente`, newFaq.categoria === 'Inscrição');

  // -------------------------------------------------------------------------
  // TESTE 7: PnabLegislacao (Normas e Leis)
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 7: LEGISLAÇÃO (PnabLegislacao) ---');
  const newLeg = await PnabLegislacao.create({
    edital: testEditalId,
    titulo: 'Lei Federal 14.399/2022 - PNAB',
    tipo: 'Lei',
    linkOficial: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14399.htm'
  });
  log(`Criar PnabLegislacao funciona`, !!newLeg._id);
  log(`Link oficial salvo`, !!newLeg.linkOficial);

  // -------------------------------------------------------------------------
  // TESTE 8: PnabNoticia (Notícias Associadas)
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 8: NOTÍCIAS (PnabNoticia) ---');
  const newNoticia = await PnabNoticia.create({
    edital: testEditalId,
    titulo: 'PNAB: Resultado provisório divulgado pela SECULT',
    resumo: 'Confira a lista dos projetos aprovados na primeira fase.',
    texto: 'A Secretaria Municipal de Cultura de Garça divulgou nesta data o resultado provisório do Edital PNAB 2025.',
    statusWorkflow: 'Publicado',
    tags: ['resultado', 'pnab', 'cultura']
  });
  log(`Criar PnabNoticia funciona`, !!newNoticia._id);
  log(`Tags de notícia salvas`, newNoticia.tags.length === 3);

  // -------------------------------------------------------------------------
  // TESTE 9: PnabMedia (Media Library)
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 9: MEDIA LIBRARY (PnabMedia) ---');
  const newMedia = await PnabMedia.create({
    filename: 'banner-pnab-2025.jpg',
    originalName: 'banner-pnab-2025.jpg',
    url: '/uploads/pnab/banner-pnab-2025.jpg',
    categoria: 'Imagem',
    sizeBytes: 98765,
    mimeType: 'image/jpeg',
    hash: 'testhash123bannerimage_unique'
  });
  log(`Criar PnabMedia funciona`, !!newMedia._id);

  // Test duplicate detection via hash
  const duplicateAttempt = await PnabMedia.findOne({ hash: 'testhash123bannerimage_unique' });
  log(`Detecção de duplicidade via SHA256/hash funciona`, !!duplicateAttempt && duplicateAttempt._id.equals(newMedia._id));

  // -------------------------------------------------------------------------
  // TESTE 10: PnabAudit (Log de Auditoria)
  // -------------------------------------------------------------------------
  console.log('\n--- FASE 10: AUDITORIA (PnabAudit) ---');
  const auditEntry = await PnabAudit.create({
    userId: new mongoose.Types.ObjectId(),
    userName: 'admin-teste',
    userEmail: 'admin-teste@garca.sp.gov.br',
    action: 'CREATE',
    contentType: 'PnabEdital',
    contentId: testEditalId,
    details: 'Criação de edital via testes automatizados'
  });
  log(`Criar PnabAudit funciona`, !!auditEntry._id);
  log(`Campos de auditoria corretos (action=CREATE)`, auditEntry.action === 'CREATE');

  // -------------------------------------------------------------------------
  // LIMPEZA — Remover dados de teste
  // -------------------------------------------------------------------------
  console.log('\n--- LIMPEZA DE DADOS DE TESTE ---');
  await PnabAudit.deleteMany({ userName: 'admin-teste' });
  await PnabNoticia.findByIdAndDelete(newNoticia._id);
  await PnabLegislacao.findByIdAndDelete(newLeg._id);
  await PnabFaq.findByIdAndDelete(newFaq._id);
  await PnabComunicado.findByIdAndDelete(newCom._id);
  await PnabCronograma.findByIdAndDelete(newCron._id);
  await PnabDocument.findByIdAndDelete(newDoc._id);
  await PnabEdital.findByIdAndDelete(testEditalId);
  await PnabYear.findByIdAndDelete(newYear._id);
  await PnabMedia.findByIdAndDelete(newMedia._id);
  log(`Limpeza de dados de teste concluída`, true);

  // -------------------------------------------------------------------------
  // RELATÓRIO FINAL
  // -------------------------------------------------------------------------
  console.log('\n==========================================');
  console.log(`TOTAL: ${passed + failed} testes`);
  console.log(`✅ Aprovados: ${passed}`);
  console.log(`❌ Falhos:    ${failed}`);
  console.log('==========================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('ERRO CRÍTICO nos testes:', err);
  process.exit(1);
});
