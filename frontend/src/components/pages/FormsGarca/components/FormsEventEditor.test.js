import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FormsEventEditor from './FormsEventEditor'
import { createForm, updateForm, uploadFile } from '../../../../services/formsGarcaService'

jest.mock('../../../../services/formsGarcaService', () => ({
  createForm: jest.fn(),
  updateForm: jest.fn(),
  uploadFile: jest.fn(),
}))

const mockInitialEvent = {
  _id: 'evt-123',
  titulo: 'Seminário Municipal de Inovação',
  subtitulo: 'Gestão Pública do Futuro',
  slug: 'seminario-inovacao-2026',
  dataEvento: '2026-11-20',
  dataFim: '2026-11-21',
  tipoEvento: 'presencial',
  status: 'aberto',
  local: 'Teatro Municipal',
  endereco: 'Rua Principal, 100',
  descricao: 'Descrição completa do seminário municipal.',
  inicioInscricoes: '2026-10-01',
  fimInscricoes: '2026-11-15',
  limiteInscricoes: 150,
  vagasOcupadas: 42,
  inscricoesAbertas: true,
  permitirMultiplasInscricoes: false,
  orientacoesInscricao: 'Trazer documento oficial com foto.',
  mensagemConfirmacao: 'Sua vaga está garantida!',
  corPrimaria: '#1e3a8a',
  organizadorNome: 'Secretaria de Planejamento',
  logoUrl: 'https://exemplo.com/logo.png',
  bannerUrl: 'https://exemplo.com/banner.png',
  campos: [
    {
      id: 'campo_1',
      fieldId: 'campo_1',
      label: 'Cargo / Função',
      type: 'text',
      required: true,
      placeholder: 'Seu cargo',
      options: [],
    },
  ],
}

describe('FormsEventEditor Component (Fase 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    updateForm.mockResolvedValue({ form: { ...mockInitialEvent, titulo: 'Seminário Atualizado' } })
    createForm.mockResolvedValue({ form: { _id: 'new-id', titulo: 'Novo Evento Criado' } })
  })

  test('carrega os dados do evento e exibe no formulário e no painel contextual', () => {
    render(<FormsEventEditor initial={mockInitialEvent} />)

    // Form inputs
    expect(screen.getByDisplayValue('Seminário Municipal de Inovação')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Gestão Pública do Futuro')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Teatro Municipal')).toBeInTheDocument()

    // Painel Contextual (aba Resumo ativa por padrão)
    expect(screen.getByRole('heading', { name: /visão operacional/i })).toBeInTheDocument()
    expect(screen.getAllByText('Seminário Municipal de Inovação').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('42 / 150 vagas')).toBeInTheDocument()
    expect(screen.getByText('1 (1 obrigatórios)')).toBeInTheDocument()
  })

  test('detecta alteração de campo e ativa o dirty state na StickyActionBar', () => {
    render(<FormsEventEditor initial={mockInitialEvent} />)

    // Inicialmente não deve exibir aviso de alterações não salvas
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument()

    // Altera o título
    const titleInput = screen.getByLabelText(/título \*/i)
    fireEvent.change(titleInput, { target: { name: 'titulo', value: 'Seminário Modificado' } })

    // Agora o dirty state deve estar ativo
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /descartar alterações/i })).toBeInTheDocument()
  })

  test('cancela alterações restaurando o snapshot inicial sem sair da tela', () => {
    render(<FormsEventEditor initial={mockInitialEvent} />)

    const titleInput = screen.getByLabelText(/título \*/i)
    fireEvent.change(titleInput, { target: { name: 'titulo', value: 'Nome Temporário que Será Cancelado' } })
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()

    // Clica em descartar alterações
    const discardBtn = screen.getByRole('button', { name: /descartar alterações/i })
    fireEvent.click(discardBtn)

    // Valor restaurado e dirty limpo
    expect(screen.getByDisplayValue('Seminário Municipal de Inovação')).toBeInTheDocument()
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument()
  })

  test('salva alterações com sucesso chamando updateForm para evento existente', async () => {
    const handleSaved = jest.fn()
    render(<FormsEventEditor initial={mockInitialEvent} onSaved={handleSaved} />)

    const titleInput = screen.getByLabelText(/título \*/i)
    fireEvent.change(titleInput, { target: { name: 'titulo', value: 'Seminário Atualizado' } })

    const saveBtn = screen.getByRole('button', { name: /salvar formulário/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(updateForm).toHaveBeenCalledWith(
        'evt-123',
        expect.objectContaining({ titulo: 'Seminário Atualizado' })
      )
      expect(handleSaved).toHaveBeenCalled()
    })
  })

  test('trata erro no salvamento sem limpar o formulário', async () => {
    const handleError = jest.fn()
    updateForm.mockRejectedValueOnce(new Error('Erro de conexão com o banco'))

    render(<FormsEventEditor initial={mockInitialEvent} setError={handleError} />)

    const titleInput = screen.getByLabelText(/título \*/i)
    fireEvent.change(titleInput, { target: { name: 'titulo', value: 'Título com Falha' } })

    const saveBtn = screen.getByRole('button', { name: /salvar formulário/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(handleError).toHaveBeenCalledWith('Erro de conexão com o banco')
    })

    // Garante que o texto digitado permanece no formulário
    expect(screen.getByDisplayValue('Título com Falha')).toBeInTheDocument()
  })

  test('protege contra perda acidental de alterações ao tentar sair', () => {
    const handleCancel = jest.fn()
    render(<FormsEventEditor initial={mockInitialEvent} onCancel={handleCancel} />)

    // Altera campo para ficar dirty
    const titleInput = screen.getByLabelText(/título \*/i)
    fireEvent.change(titleInput, { target: { name: 'titulo', value: 'Alteração Pendente' } })

    // Clica no botão de voltar do header
    const backBtn = screen.getByRole('button', { name: /voltar para a lista de meus eventos/i })
    fireEvent.click(backBtn)

    // Diálogo modal de proteção deve abrir
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/existem alterações não salvas/i)).toBeInTheDocument()
    expect(handleCancel).not.toHaveBeenCalled()

    // Se clicar em "Continuar editando", o diálogo fecha
    const stayBtn = screen.getByRole('button', { name: /continuar editando/i })
    fireEvent.click(stayBtn)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    // Se clicar novamente e escolher "Sair sem salvar", onCancel é acionado
    fireEvent.click(backBtn)
    const leaveBtn = screen.getByRole('button', { name: /sair sem salvar/i })
    fireEvent.click(leaveBtn)
    expect(handleCancel).toHaveBeenCalled()
  })

  test('alterna para a aba Prévia no Painel Contextual e reflete alterações em tempo real', () => {
    render(<FormsEventEditor initial={mockInitialEvent} />)

    // Clica na aba Prévia do painel contextual
    const previewTab = screen.getByRole('tab', { name: /prévia/i })
    fireEvent.click(previewTab)

    expect(screen.getByText(/pré-visualização em tempo real · somente leitura/i)).toBeInTheDocument()
    expect(screen.getAllByText('Seminário Municipal de Inovação').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Cargo / Função').length).toBeGreaterThanOrEqual(1)

    // Altera o título no formulário e verifica sincronização em tempo real na prévia
    const titleInput = screen.getByLabelText(/título \*/i)
    fireEvent.change(titleInput, { target: { name: 'titulo', value: 'Novo Título em Tempo Real' } })

    expect(screen.getAllByText('Novo Título em Tempo Real').length).toBeGreaterThanOrEqual(1)
  })

  test('sincroniza a alteração de cor primária na prévia', () => {
    render(<FormsEventEditor initial={mockInitialEvent} />)

    // Alterna para a prévia
    const previewTab = screen.getByRole('tab', { name: /prévia/i })
    fireEvent.click(previewTab)

    // Altera o input de cor hexadecimal
    const colorTextInput = screen.getByPlaceholderText('#1e3a8a')
    fireEvent.change(colorTextInput, { target: { name: 'corPrimaria', value: '#15803d' } })

    const previewContainer = screen.getByLabelText(/prévia em tempo real do formulário público/i)
    expect(previewContainer).toHaveStyle({ '--preview-accent': '#15803d' })
  })

  test('exibe checklist de prontidão com diferenciação obrigatório vs recomendação', () => {
    render(<FormsEventEditor initial={mockInitialEvent} />)

    expect(screen.getByText(/revisão e prontidão de publicação/i)).toBeInTheDocument()
    expect(screen.getAllByText('Obrigatório OK').length).toBe(2) // Título e Data
    expect(screen.getAllByText('Recomendado').length).toBe(2) // Campos e Visual
    expect(screen.getAllByText('Informativo').length).toBe(2) // Vagas e Abertura
  })
})
