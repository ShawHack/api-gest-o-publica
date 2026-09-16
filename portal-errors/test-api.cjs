const assert = require('node:assert/strict');
const express = require('/app/node_modules/express');
const middleware = require('/app/helpers/api-not-found');
const app = express();
app.get('/valid', (_, res) => res.json({ok:true}));
app.get('/resource', (_, res) => res.status(404).json({message:'Recurso ausente'}));
app.get('/private', (_, res) => res.status(401).json({message:'Sessão necessária'}));
app.use(middleware);
app.use((_,res) => res.type('html').send('<h1>Web</h1>'));
const server = app.listen(0, '127.0.0.1', async () => {
 try {
  const base='http://127.0.0.1:'+server.address().port;
  for (const [path, status] of [['/valid',200],['/resource',404],['/private',401],['/missing',404],['/api/missing',404]]) {
   const r=await fetch(base+path,{headers:{'X-SEMIT-API-Request':'1'}});
   assert.equal(r.status,status); assert(r.headers.get('content-type').includes('application/json')); await r.json();
  }
  const web=await fetch(base+'/web'); assert.equal(web.status,200); assert((await web.text()).includes('Web'));
  console.log('OK API: JSON 404, responses 200/401/404 preserved, web untouched');
 } catch(error) {console.error(error); process.exitCode=1;} finally {server.close();}
});
