const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const base = 'https://api.garca.sp.gov.br';
async function main() {
  const html = await (await fetch(base + '/cultura/teatro/teatro.html')).text();
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).find(x => x.includes('async function loadTeatroCartaz'));
  assert(script, 'Script do cartaz não encontrado');
  let cards = '';
  const container = { innerHTML: '', insertAdjacentHTML: (_, value) => { cards += value; } };
  const context = vm.createContext({
    document: { getElementById: () => container, addEventListener: () => {} },
    fetch: path => fetch(new URL(path, base)), console,
  });
  vm.runInContext(script, context);
  await context.loadTeatroCartaz();
  assert(cards.includes('CORPO HISTÓRIA'), 'Publicação de exemplo ausente');
  const links = [...cards.matchAll(/href="([^"]+)"/g)].map(x => x[1]);
  assert(links.length > 0);
  for (const link of links) {
    assert(link.startsWith('/cultura/eventos/detalhes.html?id='), 'Link fora do módulo Cultura');
    const page = await fetch(new URL(link, base));
    assert.equal(page.status, 200);
    const content = await page.text();
    assert(content.includes('id="detalhes-main"'), 'Destino não é a página de detalhes');
    const id = new URL(link, base).searchParams.get('id');
    const response = await fetch(base + '/api/posts/' + id);
    assert.equal(response.status, 200);
    console.log('OK cartaz -> detalhes -> API:', link);
  }
  for (const path of ['/cultura/eventos/detalhes.js', '/cultura/eventos/detalhes.css']) {
    assert.equal((await fetch(base + path)).status, 200);
    console.log('OK recurso:', path);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
