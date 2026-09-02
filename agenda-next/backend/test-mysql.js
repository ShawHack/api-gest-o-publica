const net = require('net');

async function testMysqlAuth() {
  const passwords = ['novosga', 'root', '123456', 'Garca@2024', 'Garca@2025', 'Garca@2026', ''];
  const users = ['novosga', 'root'];

  // Testar conexão simples com mysql2 se instalado
  let mysql;
  try {
    mysql = require('mysql2/promise');
  } catch (_e) {
    console.log('mysql2 nao instalado no container api');
    return;
  }

  for (const user of users) {
    for (const password of passwords) {
      try {
        const conn = await mysql.createConnection({
          host: '10.15.25.31',
          port: 3306,
          user,
          password,
          database: 'novosga',
          connectTimeout: 2000,
        });
        console.log(`SUCESSO MYSQL! user=${user} password=${password}`);
        const [rows] = await conn.execute('SELECT * FROM painel_senha ORDER BY id DESC LIMIT 5');
        console.log('Ultimas senhas no MySQL do NovoSGA:', rows);
        await conn.end();
        return;
      } catch (err) {
        // tenta proxima
      }
    }
  }
  console.log('Nenhuma credencial padrao conectou no MySQL');
}

testMysqlAuth().catch(console.error);
