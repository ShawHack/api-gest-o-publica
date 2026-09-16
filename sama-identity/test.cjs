const { JSDOM } = require('/home/semit/Documentos/api-gestao-publica/agenda-web/node_modules/jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const code = fs.readFileSync(__dirname + '/identity.js', 'utf8');
async function main() {
  const dom = new JSDOM('<header><a class="Navbar_navbar_logo__x" href="/garcapet/sama"><img><h2><span>Garça</span><span>Pet</span></h2></a></header><main><h1 class="Sama_intro_main_title__x">SEJAM BEM-VINDOS</h1></main><footer></footer>', { url: 'https://api.garca.sp.gov.br/garcapet/sama', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; let route;
  w.__garcapetOnRouteChange = fn => { route = fn; };
  w.eval(code);
  await new Promise(resolve => setTimeout(resolve, 60));
  for (const [path, mode] of [['/garcapet/sama', 'sama'], ['/garcapet/arvores', 'sama'], ['/garcapet/login', 'sama'], ['/garcapet/castracao', 'welfare'], ['/garcapet/pet/mypets', 'welfare'], ['/garcapet/adotar', 'adoption'], ['/garcapet/pet/6a99ac1e4a507b5ea19e0c65', 'adoption'], ['/garcapet/pet/myadoptions', 'adoption'], ['/garcapet/', 'adoption'], ['/garcapet/sama', 'sama']]) {
    w.history.pushState({}, '', path); route();
    await new Promise(resolve => setTimeout(resolve, 35));
    assert.equal(w.document.documentElement.dataset.samaIdentity, mode);
    assert.equal(w.document.querySelector('header h2').textContent, mode === 'adoption' ? 'GarçaPet' : 'Secretaria doMeio Ambiente');
    assert.equal(w.document.querySelectorAll('.sama-mobile-brand').length, 1);
    assert.equal(w.document.querySelectorAll('#sama-service-shortcuts').length, 1);
    assert.equal(w.document.querySelectorAll('.sama-footer-identity').length, 1);
    console.log('OK', path, mode);
  }
  // JSDOM closes the document before pending MutationObserver/RAF callbacks.
  // Finish this isolated test process after all assertions instead.
  process.exit(0);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
