const { execSync } = require('child_process')

try {
  const output = execSync(
    'ssh -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit semit@10.15.25.31 "find /home/semit -name \\"*content-admin*\\" -o -name \\"*comtur*admin*\\""',
    { encoding: 'utf-8' }
  )
  console.log('OUTPUT:\n', output)
} catch (err) {
  console.error('ERROR:\n', err.stdout || err.message)
}
