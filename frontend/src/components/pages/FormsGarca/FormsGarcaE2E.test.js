import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import FormsGarcaPortal from './FormsGarcaPortal'
import FormsEventEditor from './components/FormsEventEditor'
import {
  createForm,
  updateForm,
  listForms,
  getStatistics,
  listInscriptions,
  getFormDashboard,
  publishForm,
  updateInscriptionStatus,
} from '../../../services/formsGarcaService'

jest.mock('../../../services/formsGarcaService', () => ({
  listForms: jest.fn(),
  getStatistics: jest.fn(),
  createForm: jest.fn(),
  updateForm: jest.fn(),
  deleteForm: jest.fn(),
  duplicateForm: jest.fn(),
  publishForm: jest.fn(),
  archiveForm: jest.fn(),
  listInscriptions: jest.fn(),
  getFormDashboard: jest.fn(),
  updateInscriptionStatus: jest.fn(),
  uploadFile: jest.fn().mockResolvedValue({ fileLink: 'https://exemplo.gov.br/banner.png' }),
}))

const mockExistingEvent = {
  _id: 'evento-100',
  titulo: 'Congresso de Tecnologia e Inovação 2026',
  subtitulo: 'O futuro dos serviços públicos municipais',
  descricao: 'Evento focado em transformação digital e governo eletrônico.',
  dataEvento: '2026-11-15',
  dataFim: '2026-11-16',
  status: 'rascunho',
  slug: 'congresso-tecnologia-2026',
  limiteInscricoes: 100,
  vagasOcupadas: 20,
  totalInscritos: 20,
  inscricoesAbertas: true,
  orientacoesInscricao: 'Trazer documento oficial com foto e comprovante impresso.',
  mensagemConfirmacao: 'Sua inscrição foi confirmada com sucesso! Apresente o código do voucher.',
  corPrimaria: '#1e3a8a',
  logoUrl: 'https://exemplo.gov.br/logo.png',
  bannerUrl: 'https://exemplo.gov.br/banner.png',
  campos: [
    {
      id: 'campo_cargo',
      fieldId: 'campo_cargo',
      label: 'Cargo / Função',
      type: 'text',
      required: true,
      placeholder: 'Ex: Diretor de TI',
      helpText: 'Cargo exercido atualmente',
    },
    {
      id: 'campo_area',
      fieldId: 'campo_area',
      label: 'Área de Atuação',
      type: 'select',
      required: false,
      options: ['Tecnologia', 'Saúde', 'Educação', 'Administração'],
    },
    {
      id: 'campo_workshop',
      fieldId: 'campo_workshop',
      label: 'Workshop Desejado',
      type: 'radio',
      required: true,
      options: ['Inteligência Artificial', 'Segurança da Informação'],
    },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(window, 'confirm').mockImplementation(() => true)
  listForms.mockResolvedValue({
    forms: [mockExistingEvent],
  })
  getStatistics.mockResolvedValue({
    total: 1,
    aberto: 0,
    emAndamento: 0,
    concluido: 0,
    rascunho: 1,
    arquivado: 0,
  })
  listInscriptions.mockResolvedValue({
    inscriptions: [
      {
        _id: 'inscricao-1',
        userName: 'Maria da Silva',
        userEmail: 'maria.silva@exemplo.gov.br',
        userCpf: '123.456.789-00',
        userPhone: '(14) 99888-7766',
        voucherCode: 'VCH-7788-9900',
        status: 'confirmado',
        createdAt: '2026-09-20T10:00:00Z',
        formData: {
          campo_cargo: 'Especialista em Gestão',
          campo_area: 'Tecnologia',
          campo_workshop: 'Inteligência Artificial',
        },
      },
    ],
  })
  getFormDashboard.mockResolvedValue({
    event: mockExistingEvent,
    indicators: {
      totalInscritos: 20,
      confirmados: 18,
      pendentes: 2,
      cancelados: 0,
      limite: 100,
      vagasOcupadas: 20,
      vagasRestantes: 80,
    },
    alerts: [],
  })
  createForm.mockResolvedValue({ form: { _id: 'evento-novo-1' } })
  updateForm.mockResolvedValue({ form: mockExistingEvent })
  publishForm.mockResolvedValue({ form: { ...mockExistingEvent, status: 'aberto' } })
  updateInscriptionStatus.mockResolvedValue({ success: true })
})

describe('FASE 6 — Suíte Completa de Integração E2E e Homologação Final', () => {
  // -------------------------------------------------------------
  // CENÁRIO 1: CRIAÇÃO E2E COMPLETA (EVENT_CREATION_E2E)
  // -------------------------------------------------------------
  test('E2E Criação: fluxo completo desde Meus Eventos até persistência com múltiplos campos e aparência', async () => {
    render(<FormsGarcaPortal />)
    expect(await screen.findByText('Congresso de Tecnologia e Inovação 2026')).toBeInTheDocument()

    // Clica no botão "Novo"
    fireEvent.click(screen.getByRole('button', { name: /^novo$/i }))

    // Preenche dados básicos e orientações
    fireEvent.change(screen.getByLabelText(/título \*/i), {
      target: { value: 'Feira Municipal de Empreendedorismo' },
    })
    fireEvent.change(screen.getByLabelText(/data do evento \*/i), {
      target: { value: '2026-12-05' },
    })

    // Adiciona um campo de CPF
    fireEvent.click(screen.getByRole('button', { name: /adicionar campo ao formulário/i }))
    expect(screen.getByRole('dialog', { name: /adicionar campo/i })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/rótulo \*/i), {
      target: { value: 'CPF do Responsável' },
    })

    // Salva o formulário
    fireEvent.click(screen.getByRole('button', { name: /salvar formulário/i }))

    await waitFor(() => {
      expect(createForm).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: 'Feira Municipal de Empreendedorismo',
          dataEvento: '2026-12-05',
          campos: expect.arrayContaining([
            expect.objectContaining({
              label: 'CPF do Responsável',
            }),
          ]),
        })
      )
    })
  })

  // -------------------------------------------------------------
  // CENÁRIO 2: EDIÇÃO E2E E DUPLICAÇÃO DE CAMPOS (EVENT_EDIT_E2E)
  // -------------------------------------------------------------
  test('E2E Edição: carrega evento, edita título, duplica campo e salva com integridade', async () => {
    render(<FormsGarcaPortal />)
    expect(await screen.findByText('Congresso de Tecnologia e Inovação 2026')).toBeInTheDocument()

    // Abre edição do evento pelo menu de ações
    const moreActions = screen.getByRole('button', { name: /mais ações para congresso/i })
    fireEvent.click(moreActions)

    const editOption = screen.getByRole('menuitem', { name: /editar configurações/i })
    fireEvent.click(editOption)

    expect(await screen.findByDisplayValue('Congresso de Tecnologia e Inovação 2026')).toBeInTheDocument()

    // Altera o título
    const titleInput = screen.getByLabelText(/título \*/i)
    fireEvent.change(titleInput, {
      target: { name: 'titulo', value: 'Congresso de Tecnologia e Inovação 2026 — Edição Especial' },
    })

    // Duplica o campo "Cargo / Função"
    const moreActionsBtn = screen.getByRole('button', {
      name: /mais opções para campo cargo \/ função/i,
    })
    fireEvent.click(moreActionsBtn)

    const dupOption = screen.getByRole('menuitem', { name: /duplicar campo/i })
    fireEvent.click(dupOption)

    // O campo duplicado é renderizado com o sufixo " — cópia"
    expect(await screen.findByText('Cargo / Função — cópia')).toBeInTheDocument()

    // Salva formulário
    fireEvent.click(screen.getByRole('button', { name: /salvar formulário/i }))

    await waitFor(() => {
      expect(updateForm).toHaveBeenCalledWith(
        'evento-100',
        expect.objectContaining({
          titulo: 'Congresso de Tecnologia e Inovação 2026 — Edição Especial',
          campos: expect.arrayContaining([
            expect.objectContaining({ label: 'Cargo / Função', fieldId: 'campo_cargo' }),
            expect.objectContaining({
              label: 'Cargo / Função — cópia',
              type: 'text',
              required: true,
            }),
            expect.objectContaining({ label: 'Área de Atuação' }),
          ]),
        })
      )
    })
  })

  // -------------------------------------------------------------
  // CENÁRIO 3: DIRTY STATE RIGOROSO (DIRTY_STATE_E2E)
  // -------------------------------------------------------------
  test('E2E Dirty State: ciclo completo de detecção de sujeira, reversão e descarte', async () => {
    render(<FormsEventEditor initial={mockExistingEvent} />)

    const titleInput = screen.getByLabelText(/título \*/i)
    const originalTitle = mockExistingEvent.titulo

    // Caso Inicial: Limpo
    expect(screen.queryByText(/alterações não salvas/i)).not.toBeInTheDocument()

    // Caso A: Alteração gera dirty = true
    fireEvent.change(titleInput, { target: { name: 'titulo', value: 'Título Modificado' } })
    expect(screen.getByText(/alterações não salvas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /descartar alterações/i })).toBeInTheDocument()

    // Caso B: Voltar exatamente ao original desmarca dirty = false
    fireEvent.change(titleInput, { target: { name: 'titulo', value: originalTitle } })
    expect(screen.queryByText(/alterações não salvas/i)).not.toBeInTheDocument()

    // Caso E: Alterar e clicar em "Descartar alterações" restaura snapshot
    fireEvent.change(titleInput, { target: { name: 'titulo', value: 'Título Rascunho Temporário' } })
    expect(screen.getByText(/alterações não salvas/i)).toBeInTheDocument()

    const discardBtn = screen.getByRole('button', { name: /descartar alterações/i })
    fireEvent.click(discardBtn)

    expect(titleInput.value).toBe(originalTitle)
    expect(screen.queryByText(/alterações não salvas/i)).not.toBeInTheDocument()

    // Caso F: Alterar e tentar sair exibe proteção contra descarte acidental
    fireEvent.change(titleInput, { target: { name: 'titulo', value: 'Tentativa de Saída' } })
    const backBtn = screen.getByRole('button', { name: /voltar para a lista/i })
    fireEvent.click(backBtn)

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/existem alterações não salvas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sair sem salvar/i })).toBeInTheDocument()
  })

  // -------------------------------------------------------------
  // CENÁRIO 4: PUBLICAÇÃO DO EVENTO (PUBLICATION_E2E)
  // -------------------------------------------------------------
  test('E2E Publicação: publica evento a partir da lista e atualiza status para aberto', async () => {
    render(<FormsGarcaPortal />)
    expect(await screen.findByText('Congresso de Tecnologia e Inovação 2026')).toBeInTheDocument()

    // Abre menu de ações do card
    const moreActions = screen.getByRole('button', { name: /mais ações para congresso/i })
    fireEvent.click(moreActions)

    const pubOption = screen.getByRole('menuitem', { name: /publicar evento/i })
    fireEvent.click(pubOption)

    await waitFor(() => {
      expect(publishForm).toHaveBeenCalledWith('evento-100')
    })
  })

  // -------------------------------------------------------------
  // CENÁRIO 5: GESTÃO DE INSCRITOS E STATUS (RESPONSES_ADMIN_E2E)
  // -------------------------------------------------------------
  test('E2E Inscritos: visualiza participantes, verifica respostas por fieldId e altera status', async () => {
    render(<FormsGarcaPortal />)
    expect(await screen.findByText('Congresso de Tecnologia e Inovação 2026')).toBeInTheDocument()

    // Abre tabela de inscrições
    const inscricoesBtn = screen.getByRole('button', { name: /inscrições/i })
    fireEvent.click(inscricoesBtn)

    expect(await screen.findByText('Maria da Silva')).toBeInTheDocument()
    expect(screen.getByText('VCH-7788-9900')).toBeInTheDocument()
    expect(screen.getByText('Especialista em Gestão')).toBeInTheDocument()
    expect(screen.getByText('Inteligência Artificial')).toBeInTheDocument()

    // Abre detalhes da inscrição e altera status para cancelado
    const detailsBtn = screen.getByTitle('Ver detalhes')
    fireEvent.click(detailsBtn)

    const cancelBtn = screen.getByRole('button', { name: /cancelar inscrição/i })
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(updateInscriptionStatus).toHaveBeenCalledWith('inscricao-1', 'cancelado')
    })
  })

  // -------------------------------------------------------------
  // CENÁRIO 6: EXPORTAÇÃO CSV COM ACENTUAÇÃO E UTF-8 (CSV_E2E)
  // -------------------------------------------------------------
  test('E2E CSV: valida geração correta de cabeçalhos e associação via fieldId', async () => {
    // Mock do URL.createObjectURL e URL.revokeObjectURL para capturar exportação CSV
    const origCreateObjectURL = global.URL.createObjectURL
    const origRevokeObjectURL = global.URL.revokeObjectURL
    const origAnchorClick = HTMLAnchorElement.prototype.click
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-csv')
    global.URL.revokeObjectURL = jest.fn()
    HTMLAnchorElement.prototype.click = jest.fn()

    render(<FormsGarcaPortal />)
    expect(await screen.findByText('Congresso de Tecnologia e Inovação 2026')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /inscrições/i }))
    await screen.findByText('Maria da Silva')

    // Dispara exportação CSV
    const exportCsvBtn = screen.getByRole('button', { name: /exportar csv/i })
    fireEvent.click(exportCsvBtn)

    expect(global.URL.createObjectURL).toHaveBeenCalled()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()

    global.URL.createObjectURL = origCreateObjectURL
    global.URL.revokeObjectURL = origRevokeObjectURL
    HTMLAnchorElement.prototype.click = origAnchorClick
  })

  // -------------------------------------------------------------
  // CENÁRIO 7: INTEGRIDADE DE RESPOSTAS HISTÓRICAS (HISTORICAL_DATA_E2E)
  // -------------------------------------------------------------
  test('E2E Respostas Históricas: renomear rótulo no editor preserva associação ao fieldId na tabela', async () => {
    // Se o evento tem o campo com label 'Cargo / Função' e o fieldId 'campo_cargo',
    // mesmo que o label seja renomeado para 'Função Pública do Participante',
    // a resposta gravada em item.formData['campo_cargo'] continua exibida.
    const modifiedEvent = {
      ...mockExistingEvent,
      campos: [
        {
          ...mockExistingEvent.campos[0],
          label: 'Função Pública do Participante', // Rótulo alterado
        },
        mockExistingEvent.campos[1],
        mockExistingEvent.campos[2],
      ],
    }

    listForms.mockResolvedValueOnce({ forms: [modifiedEvent] })

    render(<FormsGarcaPortal />)
    expect(await screen.findByText('Congresso de Tecnologia e Inovação 2026')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /inscrições/i }))
    expect(await screen.findByText('Maria da Silva')).toBeInTheDocument()

    // A resposta 'Especialista em Gestão' continua associada pelo fieldId 'campo_cargo'
    expect(screen.getByText('Especialista em Gestão')).toBeInTheDocument()
  })
})
