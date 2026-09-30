import React, { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FormsFieldsBuilder from './FormsFieldsBuilder'
import FormsFieldOptionsEditor from './FormsFieldOptionsEditor'
import FormsFieldTypePicker, { FIELD_TYPE_LABELS } from './FormsFieldTypePicker'
import FormsFieldDrawer from './FormsFieldDrawer'

describe('FormsFieldsBuilder Component & Builder Ecosystem', () => {
  const initialCampos = [
    {
      id: 'f1',
      fieldId: 'f1',
      label: 'Nome Completo',
      type: 'text',
      required: true,
      placeholder: 'Digite seu nome',
      helpText: 'Conforme documento',
    },
    {
      id: 'f2',
      fieldId: 'f2',
      label: 'Curso Desejado',
      type: 'select',
      required: false,
      options: ['Matemática', 'Física', 'Química'],
    },
  ]

  test('Renderização: renderiza lista de campos existentes com rótulos, badges de tipo e obrigatoriedade', () => {
    render(<FormsFieldsBuilder campos={initialCampos} onChange={jest.fn()} />)

    expect(screen.getByText('Nome Completo')).toBeInTheDocument()
    expect(screen.getByText('Texto curto')).toBeInTheDocument()
    expect(screen.getByText('Obrigatório')).toBeInTheDocument()

    expect(screen.getByText('Curso Desejado')).toBeInTheDocument()
    expect(screen.getByText('Lista suspensa')).toBeInTheDocument()
    expect(screen.getByText('Opcional')).toBeInTheDocument()
    expect(screen.getByText('3 opções')).toBeInTheDocument()
  })

  test('Renderização: estado vazio quando não há campos configurados', () => {
    render(<FormsFieldsBuilder campos={[]} onChange={jest.fn()} />)

    expect(
      screen.getByText('Nenhum campo personalizado adicionado')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /adicionar primeiro campo/i })
    ).toBeInTheDocument()
  })

  test('Compatibilidade Retroativa: normaliza campos legados sem fieldId ou options sem erro', () => {
    const legacyFields = [
      {
        id: 'legacy_1',
        label: 'Pergunta Legada',
        type: 'radio',
        // sem fieldId, sem options explícitas, required numérico
        required: 1,
      },
    ]

    render(<FormsFieldsBuilder campos={legacyFields} onChange={jest.fn()} />)

    expect(screen.getByText('Pergunta Legada')).toBeInTheDocument()
    expect(screen.getByText('Escolha única')).toBeInTheDocument()
    expect(screen.getByText('Obrigatório')).toBeInTheDocument()
    expect(screen.getByText('0 opções')).toBeInTheDocument()
  })

  test('Adição: abre drawer, preenche rótulo e aplica novo campo chamando onChange', () => {
    const handleChange = jest.fn()
    render(<FormsFieldsBuilder campos={initialCampos} onChange={handleChange} />)

    const addBtn = screen.getByRole('button', { name: /adicionar campo ao formulário/i })
    fireEvent.click(addBtn)

    // Drawer abre
    expect(screen.getByRole('dialog', { name: /adicionar campo/i })).toBeInTheDocument()

    const labelInput = screen.getByLabelText(/rótulo/i)
    fireEvent.change(labelInput, { target: { value: 'Data de Nascimento' } })

    const applyBtn = screen.getByRole('button', { name: /aplicar alterações/i })
    fireEvent.click(applyBtn)

    expect(handleChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Nome Completo' }),
        expect.objectContaining({ label: 'Curso Desejado' }),
        expect.objectContaining({ label: 'Data de Nascimento' }),
      ])
    )
  })

  test('Edição com Draft: Cancelar no drawer descarta alterações sem chamar onChange', () => {
    const handleChange = jest.fn()
    render(<FormsFieldsBuilder campos={initialCampos} onChange={handleChange} />)

    const editBtn = screen.getByRole('button', { name: /editar campo nome completo/i })
    fireEvent.click(editBtn)

    // Drawer abre em modo de edição
    expect(screen.getByRole('dialog', { name: /editar campo/i })).toBeInTheDocument()

    const labelInput = screen.getByLabelText(/rótulo/i)
    fireEvent.change(labelInput, { target: { value: 'Nome do Participante' } })

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i })
    fireEvent.click(cancelBtn)

    // onChange não foi chamado
    expect(handleChange).not.toHaveBeenCalled()
    // Drawer foi fechado
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('Edição: Aplicar alterações no drawer atualiza o campo e chama onChange', () => {
    const handleChange = jest.fn()
    render(<FormsFieldsBuilder campos={initialCampos} onChange={handleChange} />)

    const editBtn = screen.getByRole('button', { name: /editar campo nome completo/i })
    fireEvent.click(editBtn)

    const labelInput = screen.getByLabelText(/rótulo/i)
    fireEvent.change(labelInput, { target: { value: 'Nome Social Completo' } })

    const applyBtn = screen.getByRole('button', { name: /aplicar alterações/i })
    fireEvent.click(applyBtn)

    expect(handleChange).toHaveBeenCalledWith([
      expect.objectContaining({
        label: 'Nome Social Completo',
        fieldId: 'f1',
      }),
      expect.objectContaining({
        fieldId: 'f2',
      }),
    ])
  })

  test('Validação do Drawer: impede aplicação com rótulo vazio', () => {
    const handleChange = jest.fn()
    render(<FormsFieldsBuilder campos={initialCampos} onChange={handleChange} />)

    const editBtn = screen.getByRole('button', { name: /editar campo nome completo/i })
    fireEvent.click(editBtn)

    const labelInput = screen.getByLabelText(/rótulo/i)
    fireEvent.change(labelInput, { target: { value: '   ' } })

    const applyBtn = screen.getByRole('button', { name: /aplicar alterações/i })
    fireEvent.click(applyBtn)

    expect(
      screen.getByText('O rótulo do campo é obrigatório.')
    ).toBeInTheDocument()
    expect(handleChange).not.toHaveBeenCalled()
  })

  test('Duplicação: cria novo campo com identificador único imediatamente após o original', () => {
    const handleChange = jest.fn()
    render(<FormsFieldsBuilder campos={initialCampos} onChange={handleChange} />)

    const moreBtn = screen.getByRole('button', { name: /mais opções para campo nome completo/i })
    fireEvent.click(moreBtn)

    const dupBtn = screen.getByRole('menuitem', { name: /duplicar campo/i })
    fireEvent.click(dupBtn)

    expect(handleChange).toHaveBeenCalledWith([
      expect.objectContaining({ fieldId: 'f1', label: 'Nome Completo' }),
      expect.objectContaining({
        label: 'Nome Completo — cópia',
        type: 'text',
        required: true,
      }),
      expect.objectContaining({ fieldId: 'f2', label: 'Curso Desejado' }),
    ])

    // Verifica que o ID gerado na duplicação é diferente do original
    const duplicatedCall = handleChange.mock.calls[0][0]
    expect(duplicatedCall[1].fieldId).not.toBe('f1')
    expect(duplicatedCall[1].fieldId).toContain('campo_')
  })

  test('Reordenação Acessível: Mover para cima e Mover para baixo reposicionam itens', () => {
    const handleChange = jest.fn()
    render(<FormsFieldsBuilder campos={initialCampos} onChange={handleChange} />)

    // Abre menu do segundo campo ("Curso Desejado") e move para cima
    const moreBtn = screen.getByRole('button', { name: /mais opções para campo curso desejado/i })
    fireEvent.click(moreBtn)

    const moveUpBtn = screen.getByRole('menuitem', { name: /mover para cima/i })
    fireEvent.click(moveUpBtn)

    expect(handleChange).toHaveBeenCalledWith([
      expect.objectContaining({ fieldId: 'f2', label: 'Curso Desejado' }),
      expect.objectContaining({ fieldId: 'f1', label: 'Nome Completo' }),
    ])
  })

  test('Exclusão: abre confirmação, exibe aviso e remove campo após confirmação', () => {
    const handleChange = jest.fn()
    render(
      <FormsFieldsBuilder
        campos={initialCampos}
        onChange={handleChange}
        eventInscriptionsCount={12}
      />
    )

    const moreBtn = screen.getByRole('button', { name: /mais opções para campo curso desejado/i })
    fireEvent.click(moreBtn)

    const delMenuBtn = screen.getByRole('menuitem', { name: /excluir campo/i })
    fireEvent.click(delMenuBtn)

    // Modal de confirmação aberto com aviso de inscrições existentes
    expect(screen.getByRole('dialog', { name: /excluir campo\?/i })).toBeInTheDocument()
    expect(screen.getByText(/este evento possui 12 inscrição\(ões\)/i)).toBeInTheDocument()

    // Confirma exclusão
    const confirmDelBtn = screen.getByRole('button', { name: /^excluir campo$/i })
    fireEvent.click(confirmDelBtn)

    expect(handleChange).toHaveBeenCalledWith([
      expect.objectContaining({ fieldId: 'f1', label: 'Nome Completo' }),
    ])
  })

  test('FormsFieldOptionsEditor: adiciona nova opção, edita texto e remove opção', () => {
    const handleOptionsChange = jest.fn()
    render(
      <FormsFieldOptionsEditor
        options={['Opção A', 'Opção B']}
        onChange={handleOptionsChange}
      />
    )

    expect(screen.getByDisplayValue('Opção A')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Opção B')).toBeInTheDocument()

    // Adiciona nova opção
    const addOptBtn = screen.getByRole('button', { name: /adicionar opção/i })
    fireEvent.click(addOptBtn)

    expect(handleOptionsChange).toHaveBeenCalledWith(['Opção A', 'Opção B', 'Opção 3'])

    // Edita texto da Opção A
    const inputA = screen.getByDisplayValue('Opção A')
    fireEvent.change(inputA, { target: { value: 'Opção Alfa' } })
    expect(handleOptionsChange).toHaveBeenCalledWith(['Opção Alfa', 'Opção B'])

    // Remove Opção B
    const removeBtns = screen.getAllByRole('button', { name: /remover opção/i })
    fireEvent.click(removeBtns[1])
    expect(handleOptionsChange).toHaveBeenCalledWith(['Opção A'])
  })

  test('FormsFieldTypePicker: renderiza todas as 12 categorias de tipo e dispara seleção', () => {
    const handleSelectType = jest.fn()
    render(
      <FormsFieldTypePicker
        selectedType="text"
        onSelectType={handleSelectType}
      />
    )

    // Verifica presença das 4 categorias de UI
    expect(screen.getByText('Básicos')).toBeInTheDocument()
    expect(screen.getByText('Contato')).toBeInTheDocument()
    expect(screen.getByText('Escolha')).toBeInTheDocument()
    expect(screen.getByText('Outros')).toBeInTheDocument()

    // Clica no tipo CPF
    const cpfBtn = screen.getByRole('button', { name: /tipo cpf/i })
    fireEvent.click(cpfBtn)
    expect(handleSelectType).toHaveBeenCalledWith('cpf')
  })
})
