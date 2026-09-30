import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import FormsEventsList from './FormsEventsList'

const mockForms = [
  {
    _id: 'event-1',
    titulo: 'Conferência Municipal de Tecnologia',
    subtitulo: 'Inovação no Setor Público',
    dataEvento: '2026-11-15T09:00:00Z',
    dataFim: '2026-11-16T18:00:00Z',
    local: 'Teatro Municipal',
    status: 'aberto',
    publicado: true,
    inscricoesAbertas: true,
    limiteInscricoes: 200,
    vagasOcupadas: 75,
  },
  {
    _id: 'event-2',
    titulo: 'Processo Seletivo Estágio 2026',
    subtitulo: 'SEMIT - Prefeitura de Garça',
    dataEvento: '2026-12-01T08:00:00Z',
    local: 'Paço Municipal',
    status: 'rascunho',
    publicado: false,
    inscricoesAbertas: false,
    limiteInscricoes: 50,
    vagasOcupadas: 0,
  },
]

const mockStatistics = {
  total: 2,
  aberto: 1,
  rascunho: 1,
  emAndamento: 0,
  concluido: 0,
  arquivado: 0,
}

describe('FormsEventsList Component', () => {
  test('renderiza cabeçalho, resumo operacional e lista de eventos', () => {
    render(
      <FormsEventsList
        forms={mockForms}
        statistics={mockStatistics}
        statusFilter="todos"
      />
    )

    // Cabeçalho e CTA principal
    expect(screen.getByRole('heading', { level: 1, name: /meus eventos/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^novo$/i })).toBeInTheDocument()

    // Resumo Operacional Compacto
    expect(screen.getByRole('region', { name: /resumo operacional/i })).toBeInTheDocument()
    expect(screen.getByText('Total:')).toBeInTheDocument()
    expect(screen.getByText('Abertos:')).toBeInTheDocument()

    // Eventos listados
    expect(screen.getByText('Conferência Municipal de Tecnologia')).toBeInTheDocument()
    expect(screen.getByText('Processo Seletivo Estágio 2026')).toBeInTheDocument()
    expect(screen.getByText(/75/)).toBeInTheDocument()
    expect(screen.getByText(/\/ 200 vagas/)).toBeInTheDocument()
  })

  test('permite digitar no campo de busca e acionar pesquisa', () => {
    const handleSearch = jest.fn((e) => e.preventDefault())
    const setSearchQuery = jest.fn()

    render(
      <FormsEventsList
        forms={mockForms}
        statistics={mockStatistics}
        searchQuery="Tecnologia"
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
      />
    )

    const searchInput = screen.getByPlaceholderText(/buscar eventos\.\.\./i)
    expect(searchInput).toHaveValue('Tecnologia')

    fireEvent.change(searchInput, { target: { value: 'Inovação' } })
    expect(setSearchQuery).toHaveBeenCalledWith('Inovação')
  })

  test('permite filtrar por status através dos chips', () => {
    const setStatusFilter = jest.fn()

    render(
      <FormsEventsList
        forms={mockForms}
        statistics={mockStatistics}
        statusFilter="todos"
        setStatusFilter={setStatusFilter}
      />
    )

    const abertosChip = screen.getByRole('button', { name: /abertos \(1\)/i })
    fireEvent.click(abertosChip)
    expect(setStatusFilter).toHaveBeenCalledWith('aberto')
  })

  test('aciona o botão principal "Gerenciar" e o botão "Inscrições"', () => {
    const handleManage = jest.fn()
    const handleResponses = jest.fn()

    render(
      <FormsEventsList
        forms={mockForms}
        statistics={mockStatistics}
        onManage={handleManage}
        onResponses={handleResponses}
      />
    )

    const manageButtons = screen.getAllByRole('button', { name: /gerenciar/i })
    fireEvent.click(manageButtons[0])
    expect(handleManage).toHaveBeenCalledWith(mockForms[0])

    const responseButtons = screen.getAllByRole('button', { name: /inscrições/i })
    fireEvent.click(responseButtons[0])
    expect(handleResponses).toHaveBeenCalledWith(mockForms[0])
  })

  test('abre menu de mais opções (⋮) e aciona ações secundárias', () => {
    const handleEdit = jest.fn()
    const handleDuplicate = jest.fn()
    const handlePublish = jest.fn()
    const handleDelete = jest.fn()

    render(
      <FormsEventsList
        forms={mockForms}
        statistics={mockStatistics}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onPublish={handlePublish}
        onDelete={handleDelete}
      />
    )

    // Clica no menu de ações do segundo evento (rascunho)
    const moreMenuBtn = screen.getByRole('button', {
      name: /mais ações para processo seletivo estágio 2026/i,
    })
    fireEvent.click(moreMenuBtn)

    // Dropdown aberto
    expect(screen.getByRole('menu', { name: /ações secundárias/i })).toBeInTheDocument()

    // Clicar em Duplicar
    const duplicateOption = screen.getByRole('menuitem', { name: /duplicar evento/i })
    fireEvent.click(duplicateOption)
    expect(handleDuplicate).toHaveBeenCalledWith(mockForms[1])

    // Reabre para testar publicar (visível para rascunho)
    fireEvent.click(moreMenuBtn)
    const publishOption = screen.getByRole('menuitem', { name: /publicar evento/i })
    fireEvent.click(publishOption)
    expect(handlePublish).toHaveBeenCalledWith(mockForms[1])
  })

  test('exibe estado vazio quando não há nenhum evento criado', () => {
    const handleCreate = jest.fn()

    render(
      <FormsEventsList
        forms={[]}
        statistics={{ total: 0 }}
        statusFilter="todos"
        searchQuery=""
        onCreate={handleCreate}
      />
    )

    expect(screen.getByRole('heading', { level: 3, name: /nenhum evento criado/i })).toBeInTheDocument()
    const createFirstBtn = screen.getByRole('button', { name: /criar primeiro evento/i })
    fireEvent.click(createFirstBtn)
    expect(handleCreate).toHaveBeenCalled()
  })

  test('exibe estado de busca sem resultados e botão de limpar filtros', () => {
    const setSearchQuery = jest.fn()
    const setStatusFilter = jest.fn()

    render(
      <FormsEventsList
        forms={[]}
        statistics={{ total: 2 }}
        statusFilter="aberto"
        searchQuery="palavra-chave-inexistente"
        setSearchQuery={setSearchQuery}
        setStatusFilter={setStatusFilter}
      />
    )

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /nenhum evento encontrado para os filtros selecionados/i,
      })
    ).toBeInTheDocument()

    const clearBtn = screen.getByRole('button', { name: /limpar filtros/i })
    fireEvent.click(clearBtn)
    expect(setSearchQuery).toHaveBeenCalledWith('')
    expect(setStatusFilter).toHaveBeenCalledWith('todos')
  })

  test('exibe estado de erro com botão de tentar novamente', () => {
    const handleRetry = jest.fn()

    render(
      <FormsEventsList
        forms={[]}
        error="Falha na conexão com o servidor municipal."
        onRetry={handleRetry}
      />
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Falha na conexão com o servidor municipal.')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: /tentar novamente/i })
    fireEvent.click(retryBtn)
    expect(handleRetry).toHaveBeenCalled()
  })
})
