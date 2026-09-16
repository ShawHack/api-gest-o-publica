import { execSync } from 'child_process'

try {
  const output = execSync(
    'ssh -i C:/Users/saulo.lima/.ssh/id_ed25519_api_semit semit@10.15.25.31 "docker exec -i novosga-2210-mysqldb-1 mysql -u novosga -padmin novosga2 -e \'SHOW TABLES LIKE \\"%oauth%\\"; SELECT * FROM oauth2_client; SELECT id, login, ativo FROM usuarios;\'"',
    { encoding: 'utf-8' }
  )
  console.log('OUTPUT:\n', output)
} catch (err) {
  console.error('ERROR:\n', err.stdout || err.message)
}
