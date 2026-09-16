const { execSync } = require('child_process')

try {
  execSync('scp -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit scratch/patch_routes.py semit@10.15.25.28:/tmp/patch_routes.py', { encoding: 'utf-8' })
  const res = execSync('ssh -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit semit@10.15.25.28 "python3 /tmp/patch_routes.py && docker cp /home/semit/Documentos/api-semit/backend/routes/ComturRoutes.js api:/app/routes/ComturRoutes.js && docker restart api"', { encoding: 'utf-8' })
  console.log(res)
} catch (e) {
  console.error(e.stdout || e.message)
}
