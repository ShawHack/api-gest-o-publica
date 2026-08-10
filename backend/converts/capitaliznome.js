// capitaliznome.js
const fs = require('fs');

const ENTRADA = './sepultados.json';
const SAIDA   = './sepultados2.json';

// -------- utilidades --------
function preCleanJSON(text) {
  let s = text.replace(/^\uFEFF/, '');
  s = s.replace(/\/\/[^\n\r]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/,\s*(\}|\])/g, '$1');
  return s.trim();
}
function isDesconhecido(v) {
  if (v == null) return true;
  if (typeof v !== 'string') return false;
  const s = v.trim().toLowerCase();
  return s === 'desconhecido' || s === 'null' || s === 'nulo' || s === '';
}
function capitalizarNomeCompleto(nome) {
  if (typeof nome !== 'string') return nome;
  const minusculasFixas = new Set(['de', 'da', 'das', 'do', 'dos', 'e', 'di', 'du']);
  return nome
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i) => (i > 0 && minusculasFixas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
}
function capIfStringPreservandoDesconhecido(v) {
  if (isDesconhecido(v)) return 'desconhecido';
  if (typeof v === 'string') return capitalizarNomeCompleto(v.trim());
  return v;
}
function ensureStringOrDesconhecido(v) {
  if (isDesconhecido(v) || v == null) return 'desconhecido';
  return String(v).trim();
}
function parseCoord(v) {
  if (isDesconhecido(v) || v == null) return 0;
  if (typeof v === 'string') {
    const n = Number(v.trim().replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  return Number.isFinite(v) ? Number(v) : 0;
}
function ensureArray(a) { return Array.isArray(a) ? a : []; }
function ensureBoolean(b, fallback = false) {
  if (typeof b === 'boolean') return b;
  if (typeof b === 'string') {
    const s = b.trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return fallback;
}

// -------- normalização do documento --------
function normalizeDoc(doc) {
  const _id  = doc?._id != null ? String(doc._id) : null;
  const id   = doc?.id  != null ? String(doc.id)  : null;

  const nome          = capIfStringPreservandoDesconhecido(doc?.nome);
  const cemiterio     = capIfStringPreservandoDesconhecido(doc?.cemiterio);
  const mae           = capIfStringPreservandoDesconhecido(doc?.mae);
  const pai           = capIfStringPreservandoDesconhecido(doc?.pai);
  const rua           = capIfStringPreservandoDesconhecido(doc?.rua);
  const nacionalidade = capIfStringPreservandoDesconhecido(doc?.nacionalidade);
  const tipoSepultura = ensureStringOrDesconhecido(doc?.tipoSepultura);
  const epitafio      = ensureStringOrDesconhecido(doc?.epitafio);

  const chapa  = ensureStringOrDesconhecido(doc?.chapa);
  const idade  = ensureStringOrDesconhecido(doc?.idade);
  const dtFal  = ensureStringOrDesconhecido(doc?.dtFal);
  const dtNasc = ensureStringOrDesconhecido(doc?.dtNasc);
  const quadra = ensureStringOrDesconhecido(doc?.quadra);

  const moderacao = ensureBoolean(doc?.moderacao, false);
  const available = ensureBoolean(doc?.available, false);

  const comentarios = ensureArray(doc?.comentarios);
  const images      = ensureArray(doc?.images);

  const user = {
    createdAt: doc?.user?.createdAt ? String(doc.user.createdAt) : 'desconhecido',
    updatedAt: doc?.user?.updatedAt ? String(doc.user.updatedAt) : 'desconhecido',
  };

  const latitude  = parseCoord(doc?.latitude);
  const longitude = parseCoord(doc?.longitude);

  return {
    _id, id, nome, cemiterio, chapa, idade, dtFal, dtNasc,
    mae, nacionalidade, pai, moderacao, quadra, tipoSepultura,
    rua, epitafio, comentarios, available, images, user,
    latitude, longitude
  };
}

// -------- leitura flexível (Array JSON ou NDJSON) --------
function readAsArrayOrNdjson(raw) {
  const trimmed = raw.trimStart();
  // Array JSON?
  if (trimmed.startsWith('[')) {
    let data;
    try {
      data = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error('Root não é array.');
      return data;
    } catch (e1) {
      // tenta pre-clean
      const cleaned = preCleanJSON(raw);
      try {
        const d2 = JSON.parse(cleaned);
        if (!Array.isArray(d2)) throw new Error('Root não é array.');
        console.warn('⚠️ Arquivo era array, mas com comentários/vírgulas finais; apliquei pre-clean.');
        return d2;
      } catch (e2) {
        // falhou mesmo sendo array → repropaga o erro original
        throw e1;
      }
    }
  }

  // NDJSON (um objeto por linha)
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/);
  const items = [];
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const s = lines[i].trim();
    if (!s) continue; // pula linhas vazias
    // tenta JSON.parse na linha
    try {
      items.push(JSON.parse(preCleanJSON(s)));
    } catch (e) {
      throw new Error(`Linha ${lineNum} inválida (NDJSON): ${e.message}\nConteúdo: ${lines[i]}`);
    }
  }
  return items;
}

// -------- execução --------
try {
  const raw = fs.readFileSync(ENTRADA, 'utf8');
  const dados = readAsArrayOrNdjson(raw);

  const out = dados.map(normalizeDoc);

  fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2), 'utf8');
  console.log(`✅ Sucesso. ${out.length} registros salvos em ${SAIDA}`);
} catch (err) {
  console.error('❌ Erro ao processar:', err.message);
  process.exitCode = 1;
}
