const { execSync } = require('child_process')

try {
  const res = execSync(
    'ssh -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit semit@10.15.25.28 "head -n 10 /home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html && grep -n -C 3 \'window.uploadIntegrationCover\' /home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html"',
    { encoding: 'utf-8' }
  )
  console.log(res)
} catch (e) {
  console.error(e.stdout || e.message)
}
