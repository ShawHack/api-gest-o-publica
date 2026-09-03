-- Criação do Serviço AGENDAMENTO WEB se não existir
INSERT INTO servicos (nome, descricao, ativo, peso, created_at)
SELECT 'AGENDAMENTO WEB', 'Atendimento Agendado pelo Portal Web', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'AGENDAMENTO WEB');

-- Obter ID do serviço AGENDAMENTO WEB e vincular às unidades 4, 5, 6, 7 com local_id = 2 (Guichê)
SET @srv_id = (SELECT id FROM servicos WHERE nome = 'AGENDAMENTO WEB' LIMIT 1);

INSERT INTO servicos_unidades (servico_id, unidade_id, local_id, sigla, ativo, peso, numero_inicial, incremento)
VALUES (@srv_id, 4, 2, 'AG', 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE ativo = 1, sigla = 'AG', local_id = 2;

INSERT INTO servicos_unidades (servico_id, unidade_id, local_id, sigla, ativo, peso, numero_inicial, incremento)
VALUES (@srv_id, 5, 2, 'AG', 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE ativo = 1, sigla = 'AG', local_id = 2;

INSERT INTO servicos_unidades (servico_id, unidade_id, local_id, sigla, ativo, peso, numero_inicial, incremento)
VALUES (@srv_id, 6, 2, 'AG', 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE ativo = 1, sigla = 'AG', local_id = 2;

INSERT INTO servicos_unidades (servico_id, unidade_id, local_id, sigla, ativo, peso, numero_inicial, incremento)
VALUES (@srv_id, 7, 2, 'AG', 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE ativo = 1, sigla = 'AG', local_id = 2;

-- Exibir status final
SELECT id, nome, descricao FROM servicos WHERE nome = 'AGENDAMENTO WEB';
SELECT unidade_id, servico_id, sigla, ativo FROM servicos_unidades WHERE servico_id = @srv_id;
