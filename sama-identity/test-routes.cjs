const {JSDOM} = require('/home/semit/Documentos/api-gestao-publica/agenda-web/node_modules/jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const w = new JSDOM('<body></body>', {url:'https://api.garca.sp.gov.br/sama/',runScripts:'outside-only',pretendToBeVisual:true}).window;
w.eval(fs.readFileSync(__dirname+'/routes.js','utf8'));
for(const [old, next] of [['/garcapet/sama','/sama/'],['/garcapet/arvores','/sama/arvores'],['/garcapet/arvore/edit/123','/sama/arvore/edit/123'],['/garcapet/castracao','/sama/castracao'],['/garcapet/vacinacao','/sama/vacinacao'],['/garcapet/','/garcapet/'],['/garcapet/pet/myadoptions','/garcapet/pet/myadoptions'],['/garcapet/login','/garcapet/login']]) {
 assert.equal(w.SamaRoutes.canonical(old),next);
 assert.equal(w.SamaRoutes.legacyPath(next),old);
 w.history.pushState({},'',old+'?teste=1#secao');
 assert.equal(w.location.pathname,next); assert.equal(w.location.search,'?teste=1'); assert.equal(w.location.hash,'#secao');
 console.log('OK',old,'->',next);
}
const bundlePath = fs.existsSync(__dirname+'/main.sama-routes-20260904.js') ? __dirname+'/main.sama-routes-20260904.js' : __dirname+'/release-20260904/main.sama-routes-20260904.js';
const bundle = fs.readFileSync(bundlePath,'utf8');
assert(bundle.includes('path:["/garcapet/sama","/sama/"]'));
assert(bundle.includes('path:["/garcapet/castracao","/sama/castracao"]'));
assert(bundle.includes('path:"/garcapet/login"'));
console.log('OK aliases React; login preserved');
process.exit(0);
