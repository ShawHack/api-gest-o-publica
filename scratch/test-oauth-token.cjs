const { execSync } = require('child_process')

const clientId = '30dbbc8d7f4c2906b3cf181be54c83d7'
const truncatedSecret = '84e7c4dd0a185c81b1cc48e09c82a2dc2317a6dfbb9b'
const fullSecret = '84e7c4dd0a185c81b1cc48e09c82a2dc2317a6dfbb9b26490f903b658c97a0979370324f9d90ae3b3f592560c71f32cf99de02b17a771919d1950e99749c1412'

console.log('Testing with truncated secret (what was in screenshot):')
try {
  const res1 = execSync(
    `curl -s -X POST http://10.15.25.31/api/token -d "grant_type=password&client_id=${clientId}&client_secret=${truncatedSecret}&username=admin&password=admin"`,
    { encoding: 'utf-8' }
  )
  console.log('Truncated result:', res1)
} catch (e) {
  console.log('Truncated error:', e.message)
}

console.log('\nTesting with full secret from database:')
try {
  const res2 = execSync(
    `curl -s -X POST http://10.15.25.31/api/token -d "grant_type=password&client_id=${clientId}&client_secret=${fullSecret}&username=admin&password=admin"`,
    { encoding: 'utf-8' }
  )
  console.log('Full secret result:', res2)
} catch (e) {
  console.log('Full secret error:', e.message)
}
