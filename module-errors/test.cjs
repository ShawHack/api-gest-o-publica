const {JSDOM}=require('/home/semit/Documentos/api-gestao-publica/agenda-web/node_modules/jsdom');
const fs=require('node:fs');const assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/module-guard.js','utf8');
for(const [url,valid] of [
 ['/garcapet/',true],['/garcapet/adotar',true],['/garcapet/auth/reset-password',true],['/garcapet/admin/castracao-solicitacoes',true],['/garcapet/pet/edit/123',true],['/garcapet/nao-existe',false],
 ['/agendamentos/',true],['/agendamentos/#/p/unidade/servico',true],['/agendamentos/#/p/unidade/servico?modo=1',true],['/agendamentos/#/p/%ZZ/servico',false],['/agendamentos/#/inexistente',false],['/agendamentos/inexistente',false]
]) {
 const w=new JSDOM('<div id="root">Conteúdo</div>',{url:'https://api.garca.sp.gov.br'+url,runScripts:'outside-only'}).window;
 w.eval(code);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 assert.equal(!w.document.getElementById('module-error-frame'),valid,url);
 const safe=url.startsWith('/agendamentos')?'/agendamentos/':'/garcapet/';
 w.history.pushState({},'',safe); assert(!w.document.getElementById('module-error-frame')); assert(!w.document.getElementById('root').hidden);
 w.dispatchEvent(new w.ErrorEvent('error',{error:new Error('ignored'),filename:'https://external.test/lib.js'}));assert(!w.document.getElementById('module-error-frame'));
 const prefix=safe.startsWith('/agendamentos')?'/agendamentos/assets/main.js':'/sama/main.test.js';
 w.dispatchEvent(new w.ErrorEvent('error',{error:new Error('internal'),filename:'https://api.garca.sp.gov.br'+prefix}));assert(w.document.getElementById('module-error-frame').src.endsWith('/unavailable.html'));
 console.log('OK',url);
}
process.exit(0);
