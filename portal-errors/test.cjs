const fs = require('node:fs');
const assert = require('node:assert/strict');
const { JSDOM } = require('/home/semit/Documentos/api-gestao-publica/agenda-web/node_modules/jsdom');
const code = fs.readFileSync(__dirname + '/memorial-guard.js','utf8');
const dom = new JSDOM('<div id="root"><h1>Memorial</h1></div>', {url:'https://api.garca.sp.gov.br/login',runScripts:'outside-only'});
const w = dom.window; w.eval(code);
for(const route of ['/','/login','/sepultados/123','/sepultados/edit/123','/educacao/noticias','/auth/reset-password','/shift-handovers/create']) {
 w.history.pushState({},'',route); assert(!w.document.getElementById('portal-error-frame'),route);
}
w.history.pushState({},'','/nao-existe');
assert(w.document.getElementById('portal-error-frame').src.endsWith('/404.html'));
assert(w.document.getElementById('root').hidden);
w.history.pushState({},'','/login');
assert(!w.document.getElementById('root').hidden);
w.dispatchEvent(new w.ErrorEvent('error',{error:new Error('private diagnostic'),filename:'https://third-party.test/library.js'}));
assert(!w.document.getElementById('portal-error-frame'));
w.dispatchEvent(new w.ErrorEvent('error',{error:new Error('private diagnostic'),filename:'https://api.garca.sp.gov.br/static/js/main.js'}));
assert(w.document.getElementById('portal-error-frame').src.endsWith('/unavailable.html'));
assert(!w.document.body.textContent.includes('private diagnostic'));
console.log('OK rotas conhecidas, 404 interno, retorno, falha JS propria e isolamento de erro externo');
process.exit(0);
