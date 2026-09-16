const { execSync } = require('child_process')

const patchScript = `
python3 -c "
with open('/home/semit/Documentos/api-semit/backend/routes/ComturRoutes.js', 'r', encoding='utf-8') as f:
    code = f.read()

if \\"router.post('/admin/media/upload'\\" not in code:
    code = code.replace(
        \\"router.post('/admin/media', ...adminChain, receiveFile, ComturMediaController.upload)\\",
        \\"router.post('/admin/media', ...adminChain, receiveFile, ComturMediaController.upload)\\nrouter.post('/admin/media/upload', ...adminChain, receiveFile, ComturMediaController.upload)\\"
    )
    with open('/home/semit/Documentos/api-semit/backend/routes/ComturRoutes.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print('Host ComturRoutes.js updated')
"
`

try {
  execSync('ssh -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit semit@10.15.25.28 "' + patchScript.replace(/"/g, '\\"').replace(/\n/g, ' ') + '"', { encoding: 'utf-8' })
  execSync('ssh -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit semit@10.15.25.28 "docker cp /home/semit/Documentos/api-semit/backend/routes/ComturRoutes.js api:/app/routes/ComturRoutes.js"', { encoding: 'utf-8' })
  execSync('ssh -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit semit@10.15.25.28 "docker restart api"', { encoding: 'utf-8' })
  console.log('API container updated and restarted!')
} catch (e) {
  console.error(e.stdout || e.message)
}
