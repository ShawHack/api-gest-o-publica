const { execSync } = require('child_process')

try {
  execSync('scp -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit scratch/remote_patch.py semit@10.15.25.28:/tmp/remote_patch.py', { encoding: 'utf-8' })
  const res = execSync('ssh -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit semit@10.15.25.28 "python3 /tmp/remote_patch.py"', { encoding: 'utf-8' })
  console.log(res)
} catch (e) {
  console.error(e.stdout || e.message)
}
