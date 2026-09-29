import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import FormsGarcaPortal from './FormsGarcaPortal'
import {
  createForm,
  getStatistics,
  listForms,
  listInscriptions,
  getFormDashboard,
  duplicateForm,
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
}))

beforeEach(() => {
  listForms.mockResolvedValue({
    forms: [
      {
        _id: 'form-1',
        titulo: 'Feira municipal',
        descricao: 'Inscrições',
        dataEvento: '2026-10-20',
        status: 'aberto',
        slug: 'feira-municipal',
        totalInscritos: 15,
        vagasOcupadas: 15,
        limiteInscricoes: 50,
        campos: [{ fieldId: 'nome', label: 'Nome', type: 'text' }],
      },
    ],
  })
  getStatistics.mockResolvedValue({ total: 1, aberto: 1, emAndamento: 0, concluido: 0, rascunho: 0, arquivado: 0 })
  listInscriptions.mockResolvedValue({ inscriptions: [] })
  createForm.mockResolvedValue({ form: { _id: 'new' } })
  getFormDashboard.mockResolvedValue({
    event: { _id: 'form-1', titulo: 'Feira municipal', status: 'aberto', slug: 'feira-municipal', dataEvento: '2026-10-20' },
    indicators: { totalInscritos: 15, confirmados: 15, pendentes: 0, cancelados: 0, limite: 50, vagasOcupadas: 15, vagasRestantes: 35 },
    alerts: [],
  })
})

test('lista formulários e abre inscrições', async () => {
  render(<FormsGarcaPortal />)
  expect(await screen.findByText('Feira municipal')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /inscrições/i }))
  expect(await screen.findByRole('heading', { name: /inscrições — feira municipal/i })).toBeInTheDocument()
})

test('cria formulário dinâmico', async () => {
  render(<FormsGarcaPortal />)
  await screen.findByText('Feira municipal')
  fireEvent.click(screen.getByRole('button', { name: /^novo$/i }))
  fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Novo evento' } })
  fireEvent.change(screen.getByLabelText(/data do evento/i), { target: { value: '2026-11-10' } })
  fireEvent.click(screen.getByRole('button', { name: /adicionar campo/i }))
  fireEvent.change(screen.getByLabelText(/rótulo/i), { target: { value: 'CPF' } })
  fireEvent.click(screen.getByRole('button', { name: /salvar formulário/i }))
  await waitFor(() =>
    expect(createForm).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Novo evento', campos: [expect.objectContaining({ label: 'CPF' })] })
    )
  )
})

test('abre o painel do evento com indicadores', async () => {
  render(<FormsGarcaPortal />)
  await screen.findByText('Feira municipal')
  fireEvent.click(screen.getByRole('button', { name: /painel/i }))
  expect(await screen.findByText(/total de inscritos/i)).toBeInTheDocument()
  expect(await screen.findByText('35')).toBeInTheDocument()
})
