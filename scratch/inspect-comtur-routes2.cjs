const { execSync } = require('child_process')

try {
  const output = execSync(
    'ssh -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit semit@10.15.25.28 "docker exec api sed -n \'41,75p\' /app/routes/ComturRoutes.js"',
    { encoding: 'utf-8' }
  )
  console.log('OUTPUT:\n', output)
} catch (err) {
  console.error('ERROR:\n', err.stdout || err.message)
}
