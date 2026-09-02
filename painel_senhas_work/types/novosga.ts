/** Payload bruto de PainelSenha (NovoSGA). */
export interface NovoSgaPainelSenhaRaw {
  id: number
  senha: string
  siglaSenha: string
  numeroSenha: number
  local: string
  numeroLocal: number
  peso: number
  prioridade: string
  corPrioridade: string | null
  nomeCliente: string | null
  documentoCliente: string | null
  servico: {
    id: number
    nome: string
  }
}

/** Evento Mercure panel.ticket. */
export interface NovoSgaMercurePanelEvent {
  '@type': string
  id: number
}

export interface NovoSgaApiInfo {
  status: string
  time: number
  mercureUrl: string | null
}

export interface NovoSgaUnidade {
  id: number
  nome: string
  descricao?: string | null
  ativo?: boolean
}

export interface NovoSgaServicoUnidade {
  sigla: string
  peso: number
  ativo: boolean
  tipo?: string
  mensagem?: string | null
  servico: {
    id: number
    nome: string
  }
}

export interface NovoSgaTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type?: string
}
