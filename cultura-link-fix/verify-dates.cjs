const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
async function run() {
  const html = fs.readFileSync(process.argv[2], 'utf8');
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).find(x => x.includes('async function loadTeatroCartaz'));
  for (const [data, expected] of [['2026-09-07', '07 SET'], ['2026-01-01', '01 JAN'], ['2028-02-29', '29 FEV'], ['07/09/2026', '07 SET']]) {
    let card = '';
    const context = vm.createContext({ document: { getElementById: () => ({ innerHTML: '', insertAdjacentHTML: (_, html) => { card += html; } }), addEventListener: () => {} }, console,
      fetch: async () => ({ json: async () => [{ emCartazTeatro: true, titulo: 'Teste', descricao: 'Teste', _id: 'teste', datasHorarios: [{ data, horario: '15:00' }] }] }) });
    vm.runInContext(script, context);
    await context.loadTeatroCartaz();
    assert(card.includes(expected + ' | 15:00'), data + ': ' + card);
    assert(card.includes('/cultura/eventos/detalhes.html?id=teste'));
  }
  console.log('OK: 4 datas e link preservado; fuso=' + process.env.TZ);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
