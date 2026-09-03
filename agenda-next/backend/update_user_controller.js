const fs = require('fs');
const file = '/home/semit/Documentos/api-semit/backend/controllers/UserController.js';
let content = fs.readFileSync(file, 'utf8');

const target = `      const resetPath =
        String(client || '').trim().toLowerCase() === 'garcapet'
          ? '/garcapet/auth/reset-password'
          : '/auth/reset-password'`;

const replacement = `      const clientStr = String(client || '').trim().toLowerCase();
      const refStr = String(req.headers.referer || req.headers.referrer || '').toLowerCase();
      const isAgenda = clientStr === 'agenda' || clientStr === 'agendamentos' || refStr.includes('/agendamentos');
      const isGarcaPet = clientStr === 'garcapet' || refStr.includes('/garcapet');
      const resetPath = isGarcaPet
        ? '/garcapet/auth/reset-password'
        : isAgenda
        ? '/agendamentos/#/redefinir-senha'
        : '/auth/reset-password';`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('UserController.js atualizado com sucesso!');
} else {
  console.log('Target já atualizado ou não encontrado.');
}
