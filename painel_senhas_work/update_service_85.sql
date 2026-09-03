UPDATE servicos 
SET nome = 'AGENDAMENTO WEB', 
    descricao = 'Atendimento Agendado pelo Portal Web' 
WHERE id = 85;

SELECT id, nome, descricao FROM servicos WHERE id = 85;
