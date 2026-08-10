const pdfParse = require('pdf-parse');

const SOURCE_URL =
  'https://garca.jcsistema.com/ApolloGarca/RelatorioMedicamentoPortalTransparencia';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
let _cache = { data: null, ts: 0 };

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSearchTokens(text) {
  const stopwords = new Set([
    'a', 'as', 'o', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos',
    'na', 'no', 'nas', 'nos', 'para', 'por', 'com', 'sem', 'sobre',
    'tem', 'temos', 'tenho', 'temos', 'tem', 'existe', 'teme', 'quero',
    'saber', 'sobre', 'qual', 'quais', 'onde', 'como', 'esta', 'estao',
    'disponivel', 'disponiveis', 'estoque', 'medicamento', 'medicamentos',
  ]);
  return normalizeText(text)
    .split(' ')
    .filter(Boolean)
    .filter(token => (
      /^\d+(mg|ml|mcg|g|ui)$/.test(token) ||
      (token.length >= 3 && !stopwords.has(token))
    ));
}

function isMedicationMatch(medName, rawQuery) {
  const medNorm = normalizeText(medName);
  const queryNorm = normalizeText(rawQuery);
  const tokens = extractSearchTokens(rawQuery);

  if (!medNorm) return false;
  if (queryNorm && medNorm.includes(queryNorm)) return true;

  let hits = 0;
  let hasDoseToken = false;
  for (const token of tokens) {
    if (medNorm.includes(token)) {
      hits += 1;
      if (/^\d+(mg|ml|mcg|g|ui)$/.test(token)) {
        hasDoseToken = true;
      }
    }
  }

  if (hasDoseToken) return hits >= 1;
  return hits >= 2;
}

function buscarCorrespondenciasDiretas(farmacias, pergunta, maxPorFarmacia = 8) {
  return farmacias
    .map(f => ({
      farmacia: f.nome,
      medicamentos: f.medicamentos
        .filter(m => isMedicationMatch(m.nome, pergunta))
        .slice(0, maxPorFarmacia),
    }))
    .filter(f => f.medicamentos.length > 0);
}

// ---------------------------------------------------------------------------
// Download e parse do PDF
// ---------------------------------------------------------------------------

async function fetchPdf() {
  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'SEMIT-API/1.0' },
  });
  if (!res.ok) throw new Error(`Falha ao acessar a página (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

function parsePdfText(text) {
  const farmacias = [];
  let currentFarmacia = null;
  let pendingMedLine = null;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const normalizeToken = (value) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const parseMedicationCandidate = (rawLine) => {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    // Formato esperado no PDF parseado:
    // 123NOME DO MEDICAMENTO...45Sim
    const match = line.match(/^(\d{1,3})(.+?)(\d+)(Sim|Não|Nao|N.o)\s*$/i);
    if (!match) return null;

    const item = parseInt(match[1], 10);
    const nome = match[2].trim();
    const estoque = parseInt(match[3], 10);
    const dispToken = normalizeToken(match[4]);

    if (!nome) return null;
    if (dispToken.startsWith('sim')) {
      return { item, nome, estoque, disponivel: true };
    }
    if (dispToken.startsWith('nao')) {
      return { item, nome, estoque, disponivel: false };
    }
    return null;
  };

  for (const line of lines) {
    if (/^Impresso em/i.test(line)) continue;
    if (/^Farmácia Municipal/i.test(line)) continue;
    if (/^MEDICAMENTOS FARMÁCIA/i.test(line)) continue;
    if (/^ItemMedicamento/i.test(line)) continue;
    if (/^Total Medicamento/i.test(line)) continue;
    if (/^Página \d/i.test(line)) continue;

    const farmaciaMatch = line.match(
      /^(CENTRAL DE ASSISTENCIA|USF\s.+|UBS\s.+|FARMACIA\s.+|POSTO\s.+)/i,
    );
    if (farmaciaMatch) {
      currentFarmacia = { nome: line, medicamentos: [] };
      farmacias.push(currentFarmacia);
      pendingMedLine = null;
      continue;
    }

    if (!currentFarmacia) continue;

    const parsedDirect = parseMedicationCandidate(line);
    if (parsedDirect) {
      currentFarmacia.medicamentos.push(parsedDirect);
      pendingMedLine = null;
      continue;
    }

    if (pendingMedLine) {
      const combined = `${pendingMedLine} ${line}`.replace(/\s+/g, ' ').trim();
      const parsedCombined = parseMedicationCandidate(combined);
      if (parsedCombined) {
        currentFarmacia.medicamentos.push(parsedCombined);
        pendingMedLine = null;
      } else {
        // Continua acumulando linhas para medicamentos muito longos.
        pendingMedLine = combined;
      }
      continue;
    }

    if (/^\d{1,3}\s*/.test(line)) {
      // Início de item potencialmente quebrado em mais de uma linha.
      pendingMedLine = line;
      continue;
    }

    if (
      currentFarmacia.medicamentos.length > 0 &&
      !/^\d/.test(line) &&
      !/(Sim|Não|Nao|N.o)\s*$/i.test(line)
    ) {
      const last = currentFarmacia.medicamentos[currentFarmacia.medicamentos.length - 1];
      last.nome = (last.nome + ' ' + line).trim();
    }
  }

  return farmacias;
}

async function getDados(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cache.data && now - _cache.ts < CACHE_TTL_MS) {
    return _cache.data;
  }
  const buf = await fetchPdf();
  const doc = await pdfParse(buf);
  const data = parsePdfText(doc.text);
  _cache = { data, ts: now };
  console.log(`[Medicamentos] PDF parseado: ${data.length} farmácias encontradas`);
  return data;
}

// ---------------------------------------------------------------------------
// Groq + Llama (free tier — 14.400 req/dia)
// ---------------------------------------------------------------------------

async function askAI(prompt) {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    console.log('[Medicamentos] Usando Groq/Llama como provedor de IA');
    return askGroq(prompt, groqKey);
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    console.log('[Medicamentos] Usando Gemini como provedor de IA (fallback)');
    return askGemini(prompt, geminiKey);
  }

  throw new Error('Nenhuma chave de IA configurada. Defina GROQ_API_KEY ou GEMINI_API_KEY no .env');
}

async function askGroq(prompt, apiKey) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Você é um assistente especializado em farmácia municipal de Garça-SP. Responda sempre em português brasileiro, de forma clara e objetiva.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error (${res.status}): ${err}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

async function askGemini(prompt, apiKey) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
}

// ---------------------------------------------------------------------------
// Monta contexto resumido para o prompt da IA
// ---------------------------------------------------------------------------

function buildContext(farmacias) {
  const lines = [];
  for (const f of farmacias) {
    lines.push(`\n### ${f.nome}`);
    lines.push(`Total: ${f.medicamentos.length} medicamento(s)`);

    const faltosos = f.medicamentos.filter(m => !m.disponivel);
    if (faltosos.length) {
      lines.push(`Em falta (${faltosos.length}):`);
      faltosos.forEach(m => lines.push(`  - ${m.nome}`));
    }

    const top10 = [...f.medicamentos].sort((a, b) => b.estoque - a.estoque).slice(0, 10);
    lines.push('Maiores estoques:');
    top10.forEach(m => lines.push(`  - ${m.nome}: ${m.estoque} un.`));
  }
  return lines.join('\n');
}

function buildDirectMatchesContext(matches) {
  if (!matches.length) return 'Nenhuma correspondência direta identificada pela busca local.';
  const lines = ['Correspondências diretas para a pergunta do usuário:'];
  for (const f of matches) {
    lines.push(`- ${f.farmacia}`);
    for (const m of f.medicamentos) {
      lines.push(`  - ${m.nome}: ${m.estoque} un. (${m.disponivel ? 'Disponível' : 'Em falta'})`);
    }
  }
  return lines.join('\n');
}

function buildDirectMatchesAnswer(pergunta, matches) {
  const linhas = [
    `Encontrei correspondências diretas para "${pergunta}":`,
    '',
  ];
  for (const f of matches) {
    linhas.push(`- ${f.farmacia}`);
    for (const m of f.medicamentos) {
      linhas.push(
        `  - ${m.nome}: ${m.estoque} un. (${m.disponivel ? 'Disponível' : 'Em falta'})`,
      );
    }
  }
  return linhas.join('\n');
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

module.exports = class MedicamentosController {

  static async listarTodos(_req, res) {
    try {
      const farmacias = await getDados();
      return res.json({ farmacias });
    } catch (err) {
      console.error('[Medicamentos] listarTodos:', err.message);
      return res.status(502).json({ error: 'Não foi possível obter os dados de medicamentos.' });
    }
  }

  static async listarPorFarmacia(req, res) {
    try {
      const { nome } = req.params;
      const farmacias = await getDados();
      const farmacia = farmacias.find(
        f => f.nome.toLowerCase().includes(nome.toLowerCase()),
      );
      if (!farmacia) {
        return res.status(404).json({
          error: 'Farmácia não encontrada.',
          disponiveis: farmacias.map(f => f.nome),
        });
      }
      return res.json({ farmacia });
    } catch (err) {
      console.error('[Medicamentos] listarPorFarmacia:', err.message);
      return res.status(502).json({ error: 'Não foi possível obter os dados de medicamentos.' });
    }
  }

  static async buscarMedicamento(req, res) {
    try {
      const { q } = req.query;
      if (!q || q.trim().length < 2) {
        return res.status(400).json({ error: 'Parâmetro "q" é obrigatório (mín. 2 caracteres).' });
      }
      const farmacias = await getDados();
      const termo = normalizeText(q);

      const resultados = farmacias.map(f => ({
        farmacia: f.nome,
        medicamentos: f.medicamentos.filter(m => normalizeText(m.nome).includes(termo)),
      })).filter(f => f.medicamentos.length > 0);

      return res.json({ termo: q, resultados });
    } catch (err) {
      console.error('[Medicamentos] buscarMedicamento:', err.message);
      return res.status(502).json({ error: 'Não foi possível obter os dados de medicamentos.' });
    }
  }

  static async consultar(req, res) {
    try {
      const { pergunta } = req.body;
      if (!pergunta || pergunta.trim().length < 5) {
        return res.status(400).json({
          error: 'Envie um campo "pergunta" com pelo menos 5 caracteres.',
        });
      }

      const farmacias = await getDados();
      const contexto = buildContext(farmacias);
      const correspondenciasDiretas = buscarCorrespondenciasDiretas(farmacias, pergunta);

      if (correspondenciasDiretas.length > 0) {
        return res.json({
          pergunta,
          resposta: buildDirectMatchesAnswer(pergunta, correspondenciasDiretas),
        });
      }

      const contextoDireto = buildDirectMatchesContext(correspondenciasDiretas);

      const prompt = [
        'Abaixo estão os dados atualizados das farmácias municipais de Garça-SP,',
        'extraídos do Portal da Transparência.\n',
        contextoDireto,
        '\n---\n',
        contexto,
        '\n---\n',
        `Pergunta do usuário: ${pergunta}`,
        '\nResponda de forma clara, objetiva e em português brasileiro.',
        'Se houver correspondências diretas, priorize-as na resposta.',
        'Se a pergunta envolver um medicamento específico, indique estoque e disponibilidade em cada farmácia.',
      ].join('\n');

      const resposta = await askAI(prompt);
      return res.json({ pergunta, resposta });
    } catch (err) {
      console.error('[Medicamentos] consultar:', err.message);
      const status = err.message.includes('chave de IA') ? 500 : 502;
      return res.status(status).json({ error: err.message });
    }
  }

  static async resumo(_req, res) {
    try {
      const farmacias = await getDados();

      const resumo = farmacias.map(f => {
        const total = f.medicamentos.length;
        const disponiveis = f.medicamentos.filter(m => m.disponivel).length;
        const faltosos = f.medicamentos.filter(m => !m.disponivel);
        return {
          farmacia: f.nome,
          totalMedicamentos: total,
          disponiveis,
          emFalta: faltosos.length,
          percentualFalta: total ? ((faltosos.length / total) * 100).toFixed(2) + '%' : '0%',
          medicamentosEmFalta: faltosos.map(m => m.nome),
        };
      });

      return res.json({ resumo });
    } catch (err) {
      console.error('[Medicamentos] resumo:', err.message);
      return res.status(502).json({ error: 'Não foi possível obter os dados de medicamentos.' });
    }
  }

  static async refresh(_req, res) {
    try {
      const farmacias = await getDados(true);
      return res.json({
        message: 'Cache atualizado com sucesso.',
        totalFarmacias: farmacias.length,
      });
    } catch (err) {
      console.error('[Medicamentos] refresh:', err.message);
      return res.status(502).json({ error: 'Falha ao atualizar o cache.' });
    }
  }
};
