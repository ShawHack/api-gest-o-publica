const mongoose = require('../db/conn');
const FormGarca = require('../models/FormGarca');
const InscriptionGarca = require('../models/InscriptionGarca');

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function run() {
  console.log('--- Iniciando Migração Forms Garça ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/apicemiterio?replicaSet=rs0');

  const forms = await FormGarca.find();
  console.log(`Encontrados ${forms.length} formulários.`);

  for (const form of forms) {
    let changed = false;

    if (!form.slug) {
      let baseSlug = slugify(form.titulo) || 'evento';
      let candidate = baseSlug;
      let count = 1;
      while (await FormGarca.findOne({ slug: candidate, _id: { $ne: form._id } })) {
        candidate = `${baseSlug}-${count++}`;
      }
      form.slug = candidate;
      changed = true;
      console.log(`Formulário ${form._id} recebeu slug: ${candidate}`);
    }

    if (form.publicado === undefined || form.publicado === null || !form.publicado) {
      form.publicado = form.status === 'aberto' || form.status === 'emAndamento';
      changed = true;
    }

    if (!form.tipoEvento) {
      form.tipoEvento = 'presencial';
      changed = true;
    }

    if (!form.tema) {
      form.tema = 'padrao';
      changed = true;
    }

    if (!form.corPrimaria) {
      form.corPrimaria = '#1e3a8a';
      changed = true;
    }

    if (!form.cidade) {
      form.cidade = 'Garça';
      changed = true;
    }

    if (!form.estado) {
      form.estado = 'SP';
      changed = true;
    }

    if (form.campos && form.campos.length > 0) {
      form.campos = form.campos.map((c, idx) => ({
        ...(c.toObject ? c.toObject() : c),
        ordem: c.ordem !== undefined ? c.ordem : idx,
        placeholder: c.placeholder || '',
        helpText: c.helpText || '',
      }));
      changed = true;
    }

    if (changed) {
      await form.save();
      console.log(`Formulário ${form.titulo} atualizado com sucesso.`);
    }
  }

  const inscriptions = await InscriptionGarca.find();
  console.log(`Encontradas ${inscriptions.length} inscrições.`);

  for (const insc of inscriptions) {
    let changed = false;
    if (!insc.status) {
      insc.status = 'confirmada';
      changed = true;
    }
    if (!insc.arquivos) {
      insc.arquivos = [];
      changed = true;
    }
    if (changed) {
      await insc.save();
      console.log(`Inscrição ${insc.voucherCode} atualizada com sucesso.`);
    }
  }

  console.log('Garantindo índices no MongoDB...');
  await FormGarca.syncIndexes();
  await InscriptionGarca.syncIndexes();
  console.log('Índices sincronizados!');

  console.log('--- Migração concluída com sucesso! ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});