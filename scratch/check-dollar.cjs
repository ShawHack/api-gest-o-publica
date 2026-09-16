const { execSync } = require('child_process')

try {
  const output = execSync(
    'ssh -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit semit@10.15.25.28 "grep -n -C 5 \'const \\$\' /home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html 2>/dev/null || grep -n -C 5 \'function \\$\' /home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html 2>/dev/null"',
    { encoding: 'utf-8' }
  )
  console.log('OUTPUT:\n', output)
} catch (err) {
  console.error('ERROR:\n', err.stdout || err.message)
}
