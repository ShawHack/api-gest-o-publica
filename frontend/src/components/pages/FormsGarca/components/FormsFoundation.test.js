import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  FormsStatusBadge,
  FormsSidebar,
  FormsEventHeader,
  FormsPageHeader,
  FormsSectionCard,
  FormsStickyActionBar,
  FormsAppShell,
} from './index'

describe('FormsStatusBadge', () => {
  it('renderiza o label correto de acordo com o status', () => {
    render(<FormsStatusBadge status="aberto" />)
    expect(screen.getByText('Aberto')).toBeInTheDocument()
  })

  it('permite sobrescrever o label', () => {
    render(<FormsStatusBadge status="rascunho" label="Em edição" />)
    expect(screen.getByText('Em edição')).toBeInTheDocument()
  })
})

describe('FormsPageHeader', () => {
  it('renderiza título, descrição e ações', () => {
    render(
      <FormsPageHeader
        eyebrow="Prefeitura de Garça"
        title="Meus Eventos"
        description="Gestão de formulários municipais"
        actions={<button>Novo</button>}
      />
    )
    expect(screen.getByText('Prefeitura de Garça')).toBeInTheDocument()
    expect(screen.getByText('Meus Eventos')).toBeInTheDocument()
    expect(screen.getByText('Gestão de formulários municipais')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument()
  })
})

describe('FormsEventHeader', () => {
  const mockEvent = {
    _id: 'evt-1',
    titulo: 'Festival do Café 2026',
    status: 'aberto',
    publicado: true,
    dataEvento: '2026-11-20',
    slug: 'festival-do-cafe-2026',
  }

  it('renderiza dados do evento ativo e atalhos', () => {
    const handleBack = jest.fn()
    render(<FormsEventHeader event={mockEvent} onBack={handleBack} />)

    expect(screen.getByText('Festival do Café 2026')).toBeInTheDocument()
    expect(screen.getByText('Aberto')).toBeInTheDocument()
    expect(screen.getByText('Publicado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /eventos/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /eventos/i }))
    expect(handleBack).toHaveBeenCalledTimes(1)
  })
})

describe('FormsSidebar', () => {
  it('aciona onSelectSection ao clicar em um item da navegação', () => {
    const handleSelect = jest.fn()
    render(
      <FormsSidebar
        activeSection="events"
        onSelectSection={handleSelect}
        activeEvent={{ _id: '1', titulo: 'Conferência Municipal' }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /meus eventos/i }))
    expect(handleSelect).toHaveBeenCalledWith('events')

    fireEvent.click(screen.getByRole('button', { name: /visão geral/i }))
    expect(handleSelect).toHaveBeenCalledWith('dashboard')
  })

  it('permite alternar modo recolhido/expandido', () => {
    const handleToggle = jest.fn()
    render(
      <FormsSidebar
        collapsed={false}
        onToggleCollapse={handleToggle}
      />
    )
    fireEvent.click(screen.getByLabelText(/recolher barra lateral/i))
    expect(handleToggle).toHaveBeenCalledTimes(1)
  })
})

describe('FormsSectionCard', () => {
  it('renderiza título, subtítulo e conteúdo', () => {
    render(
      <FormsSectionCard
        title="Dados Básicos"
        subtitle="Identificação do evento"
      >
        <p>Conteúdo do formulário</p>
      </FormsSectionCard>
    )
    expect(screen.getByText('Dados Básicos')).toBeInTheDocument()
    expect(screen.getByText('Identificação do evento')).toBeInTheDocument()
    expect(screen.getByText('Conteúdo do formulário')).toBeInTheDocument()
  })

  it('suporta modo recolhível', () => {
    render(
      <FormsSectionCard
        title="Configurações Avançadas"
        collapsible
        defaultCollapsed
      >
        <p>Conteúdo oculto inicialmente</p>
      </FormsSectionCard>
    )
    expect(screen.queryByText('Conteúdo oculto inicialmente')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Configurações Avançadas'))
    expect(screen.getByText('Conteúdo oculto inicialmente')).toBeInTheDocument()
  })
})

describe('FormsStickyActionBar', () => {
  it('aciona callbacks de salvar e cancelar', () => {
    const handleSave = jest.fn()
    const handleCancel = jest.fn()

    render(
      <FormsStickyActionBar
        hasUnsavedChanges
        onSave={handleSave}
        onCancel={handleCancel}
      />
    )

    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(handleSave).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(handleCancel).toHaveBeenCalledTimes(1)
  })
})

describe('FormsAppShell', () => {
  it('monta a casca com sidebar e conteúdo', () => {
    render(
      <FormsAppShell activeSection="events">
        <div data-testid="page-child">Tela de Meus Eventos</div>
      </FormsAppShell>
    )
    expect(screen.getByTestId('page-child')).toBeInTheDocument()
    expect(screen.getAllByText('Forms Garça').length).toBeGreaterThan(0)
  })
})
