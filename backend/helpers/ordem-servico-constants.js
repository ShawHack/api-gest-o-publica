const TIPOS_OS = [
  'Coleta de Inservíveis',
  'Coleta de Animais Mortos',
  'Manutenção de Vias Rurais',
  'Coleta de Galhos',
  'Manutenção de Praças',
  'Manutenção de Escolas Estaduais',
  'Prestação de Serviço às Demais Secretarias',
  'Caminhão Pipa',
]

const STATUS_OS = ['Pendente', 'Andamento', 'Concluído']

const SECRETARIAS = [
  'Paço Municipal',
  'Tiro de Guerra',
  'SAMA- Secretaria Municipal de Agricultura e Meio Ambiente',
  'SECOM- Secretaria Municipal de Comunicação',
  'SECULT- Secretaria Municipal de Cultura',
  'SECETUR- Secretaria Municipal de Desenvolvimento Econômico e Turismo',
  'SEJEL- Secretaria Municipal de Esportes',
  'SEMADS- Secretaria Municipal de Assistência e Desenvolvimento Social',
  'SEMIT- Secretaria Municipal de Tecnologia e Inovação',
  'SMA- Secretaria Municipal de Administração',
  'SME- Secretaria Municipal de Educação',
  'SMF- Secretaria Municipal da Fazenda',
  'SMO- Secretaria Municipal de Obras',
  'SMPDU- Secretaria Municipal de Planejamento e Desenvolvimento Urbano',
  'SMS- Secretaria Municipal de Saúde',
  'SMSU- Secretaria Municipal de Serviços Urbanos',
]

const CAMPOS_POR_TIPO = {
  'Coleta de Inservíveis': ['nomeCidadao', 'endereco', 'funcionarioResponsavel', 'tipoMaterial', 'observacoes', 'dataSla', 'status', 'dataTrabalho'],
  'Coleta de Animais Mortos': ['nomeCidadao', 'endereco', 'funcionarioResponsavel', 'porteAnimal', 'observacoes', 'dataSla', 'status', 'dataTrabalho'],
  'Manutenção de Vias Rurais': ['nomePropriedade', 'endereco', 'funcionarioResponsavel', 'tipoServicoDetalhe', 'observacoes', 'dataSla', 'status', 'dataTrabalho', 'ocorrencia'],
  'Coleta de Galhos': ['nomeCidadao', 'endereco', 'funcionarioResponsavel', 'observacoes', 'dataSla', 'status', 'dataTrabalho'],
  'Manutenção de Praças': ['endereco', 'funcionarioResponsavel', 'tipoServicoDetalhe', 'observacoes', 'dataSla', 'status', 'dataTrabalho', 'ocorrencia'],
  'Manutenção de Escolas Estaduais': ['nomeSolicitante', 'endereco', 'funcionarioResponsavel', 'tipoMaterial', 'observacoes', 'dataSla', 'status', 'dataTrabalho', 'ocorrencia'],
  'Prestação de Serviço às Demais Secretarias': ['secretaria', 'departamento', 'funcionarioResponsavel', 'tipoServicoDetalhe', 'observacoes', 'dataSla', 'status', 'dataTrabalho', 'ocorrencia'],
  'Caminhão Pipa': ['secretaria', 'departamento', 'funcionarioResponsavel', 'tipoServicoDetalhe', 'observacoes', 'dataSla', 'status', 'dataTrabalho', 'ocorrencia'],
}

module.exports = {
  TIPOS_OS,
  STATUS_OS,
  SECRETARIAS,
  CAMPOS_POR_TIPO,
}
