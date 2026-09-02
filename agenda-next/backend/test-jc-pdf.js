const pdfParse = require('pdf-parse');

const SOURCE_URL = 'https://garca.jcsistema.com/ApolloGarca/RelatorioMedicamentoPortalTransparencia';

function normalizeToken(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function parseMedicationCandidate(rawLine) {
  const line = rawLine.replace(/\s+/g, ' ').trim();
  const match = line.match(/^(\d{1,4})(.+?)(\d+)(Sim|Não|Nao|N.o)\s*$/i);
  if (!match) return null;

  const item = parseInt(match[1], 10);
  const nome = match[2].trim();
  const estoque = parseInt(match[3], 10);
  const dispToken = normalizeToken(match[4]);

  if (!nome) return null;
  return {
    item,
    nome,
    estoque,
    disponivel: dispToken.startsWith('sim'),
  };
}

async function debugParser() {
  const res = await fetch(SOURCE_URL, { headers: { 'User-Agent': 'SEMIT-API/1.0' } });
  const buffer = Buffer.from(await res.arrayBuffer());
  const pdf = await pdfParse(buffer);

  const lines = pdf.text.split('\n').map(l => l.trim()).filter(Boolean);
  const farmacias = [];
  let currentFarmacia = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^Impresso em/i.test(line)) continue;
    if (/^Farmácia Municipal\s*-\s*Atualizado/i.test(line)) continue;
    if (/^MEDICAMENTOS FARMÁCIA/i.test(line)) continue;
    if (/^ItemMedicamento/i.test(line)) continue;
    if (/^Total Medicamento/i.test(line)) continue;
    if (/^Página \d/i.test(line)) continue;

    // Detectar unidade
    const isUnit = /^(CENTRAL DE ASSISTENCIA|FARMÁCIA\s*-\s*USF|USF\s|UBS\s|POSTO\s)/i.test(line);
    if (isUnit) {
      currentFarmacia = { nome: line, medicamentos: [] };
      farmacias.push(currentFarmacia);
      console.log(`📍 Unidade detectada [linha ${i}]: "${line}"`);
      continue;
    }

    if (!currentFarmacia) continue;

    const parsed = parseMedicationCandidate(line);
    if (parsed) {
      currentFarmacia.medicamentos.push(parsed);
    }
  }

  console.log('--- RESUMO DAS FARMÁCIAS ENCONTRADAS ---');
  for (const f of farmacias) {
    console.log(`- ${f.nome}: ${f.medicamentos.length} medicamentos`);
  }
}

debugParser().catch(console.error);
