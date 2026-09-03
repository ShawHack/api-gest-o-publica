const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'admin',
    database: 'novosga2',
  });

  console.log('Conectado ao MySQL do NovoSGA!');

  // 1. Verificar se já existe o serviço AGENDAMENTO WEB
  const [existing] = await conn.execute("SELECT id, nome FROM servicos WHERE nome LIKE '%AGENDAMENTO%'");
  let serviceId;
  if (existing.length > 0) {
    serviceId = existing[0].id;
    console.log(`Serviço existente encontrado com ID ${serviceId}: ${existing[0].nome}`);
  } else {
    const [ins] = await conn.execute(
      "INSERT INTO servicos (nome, descricao, ativo, peso, created_at) VALUES ('AGENDAMENTO WEB', 'Atendimento Agendado pelo Portal Web', 1, 1, NOW())"
    );
    serviceId = ins.insertId;
    console.log(`Novo serviço 'AGENDAMENTO WEB' criado com ID ${serviceId}`);
  }

  // 2. Vincular às unidades 4 (SEDETUR), 5 (SEMADS), 6 (SEMIT), 7 (SAAE)
  const units = [4, 5, 6, 7];
  for (const uId of units) {
    try {
      await conn.execute(`
        INSERT INTO servicos_unidades (servico_id, unidade_id, local_id, sigla, ativo, peso, numero_inicial, incremento)
        VALUES (${serviceId}, ${uId}, 1, 'AG', 1, 1, 1, 1)
        ON DUPLICATE KEY UPDATE ativo = 1, sigla = 'AG'
      `);
      console.log(`Serviço ${serviceId} vinculado à unidade ${uId}`);
    } catch (err) {
      console.warn(`Erro vinculando à unidade ${uId}:`, err.message);
    }
  }

  console.log(`Configuração concluída! Service ID oficial para Agendamento Web: ${serviceId}`);
  await conn.end();
}

main().catch(console.error);
