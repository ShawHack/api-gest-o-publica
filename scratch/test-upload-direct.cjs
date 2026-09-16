const { execSync } = require('child_process')

try {
  const token = execSync(
    'ssh -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit semit@10.15.25.28 "curl -s -X POST http://127.0.0.1:5000/api/users/login -H \'Content-Type: application/json\' -d \'{\\\"email\\\":\\\"admin@garca.sp.gov.br\\\",\\\"password\\\":\\\"Admin@123\\\"}\'"',
    { encoding: 'utf-8' }
  )
  console.log('Login output:', token)
} catch (e) {
  console.error(e.stdout || e.message)
}
