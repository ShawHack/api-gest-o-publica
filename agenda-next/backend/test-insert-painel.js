const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: '10.15.25.31',
    port: 3306,
    user: 'novosga',
    password: 'admin',
    database: 'novosga2',
  });

  console.log('Conectado ao MySQL do NovoSGA!');
  
  // Inserir AG17
  await conn.execute(
    `INSERT INTO painel_senha (servico_id, unidade_id, num_senha, sig_senha, msg_senha, local, num_local, peso, prioridade, nome_cliente, documento_cliente)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [82, 6, 17, 'AG', '', 'Guichê', 3, 1, 'Agendamento Web', 'cidadao', '83253860027']
  );
  console.log('AG17 inserido com sucesso em painel_senha!');

  const [rows] = await conn.execute('SELECT * FROM painel_senha ORDER BY id DESC LIMIT 3');
  console.log('Últimas senhas em painel_senha:', rows);
  await conn.end();

  // Testar API NovoSGA
  const res = await fetch('http://10.15.25.31/api/unidades/6/painel?servicos=82,83,84');
  const data = await res.json();
  console.log('Topo do painel retornado pela API do NovoSGA:', data[0]);
}

main().catch(console.error);
