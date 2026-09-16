const assert = require('node:assert/strict');
const base='https://api.garca.sp.gov.br';
async function main() {
 for(const path of ['/pagina-inexistente-diagnostico-semit','/cultura/nao-existe-diagnostico.html','/static/js/nao-existe-diagnostico.js']) {
  const r=await fetch(base+path); assert.equal(r.status,404,path); const html=await r.text(); assert(html.includes('Não encontramos esta página')); assert(!html.includes('Memorial Santa Faustina')); console.log('OK 404',path);
 }
 const api=await fetch(base+'/api/rota-inexistente-diagnostico'); assert.equal(api.status,404); assert(api.headers.get('content-type').includes('application/json')); assert.equal((await api.json()).code,'NOT_FOUND'); console.log('OK API JSON 404');
 for(const path of ['/login','/auth/reset-password','/sepultados/pesquisa','/educacao/','/dashboard.html','/sama/','/garcapet/','/sama/castracao','/agendamentos/','/rotas-rurais/login','/cultura/teatro/teatro.html','/docs/platform-admin/login','/health']) {
  const r=await fetch(base+path); assert.equal(r.status,200,path); console.log('OK preservado',path);
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
