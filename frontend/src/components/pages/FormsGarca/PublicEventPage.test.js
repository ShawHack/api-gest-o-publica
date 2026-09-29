import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PublicEventPage from './PublicEventPage'
import { getPublicEvent, publicInscribe } from '../../../services/formsGarcaService'

jest.mock('../../../services/formsGarcaService', () => ({
  getPublicEvent: jest.fn(),
  publicInscribe: jest.fn(),
  publicUpload: jest.fn(),
}))

const mockEvent = {
  _id: 'evt-123',
  titulo: 'Seminário de Inovação Garça 2026',
  subtitulo: 'Tecnologia e Gestão Pública',
  slug: 'seminario-inovacao-2026',
  descricao: 'Um grande evento municipal aberto a todos.',
  tipoEvento: 'presencial',
  dataEvento: '2026-11-20T10:00:00.000Z',
  local: 'Teatro Municipal de Garça',
  endereco: 'Rua das Flores, 100',
  situacao: 'disponivel',
  motivo: '',
  limiteInscricoes: 100,
  vagasRestantes: 85,
  orientacoesInscricao: 'Chegar com 15 minutos de antecedência.',
  campos: [
    { fieldId: 'cargo', label: 'Cargo ou Ocupação', type: 'text', required: true },
  ],
}

beforeEach(() => {
  getPublicEvent.mockResolvedValue({ event: mockEvent })
  publicInscribe.mockResolvedValue({
    inscription: {
      id: 'insc-999',
      voucherCode: 'NOV02026',
      userName: 'Maria Silva',
      userEmail: 'maria.silva@exemplo.com',
      createdAt: '2026-10-01T14:30:00.000Z',
      mensagemConfirmacao: 'Apresente seu código no credenciamento.',
    },
  })
})

test('carrega e apresenta os dados públicos do evento', async () => {
  render(<PublicEventPage />)

  expect(await screen.findByText('Seminário de Inovação Garça 2026')).toBeInTheDocument()
  expect(screen.getByText('Tecnologia e Gestão Pública')).toBeInTheDocument()
  expect(screen.getByText(/Teatro Municipal de Garça/i)).toBeInTheDocument()
  expect(screen.getByText('Inscrições Abertas')).toBeInTheDocument()
  expect(screen.getByText(/85 de 100/i)).toBeInTheDocument()
})

test('preenche inscrição pública e gera comprovante com voucher', async () => {
  render(<PublicEventPage />)

  await screen.findByText('Seminário de Inovação Garça 2026')

  fireEvent.change(screen.getByPlaceholderText(/seu nome completo/i), { target: { value: 'Maria Silva' } })
  fireEvent.change(screen.getByPlaceholderText(/seu.email@exemplo.com/i), { target: { value: 'maria.silva@exemplo.com' } })
  fireEvent.change(screen.getByLabelText(/cargo ou ocupação/i), { target: { value: 'Engenheira de Software' } })

  fireEvent.click(screen.getByRole('button', { name: /confirmar inscrição/i }))

  await waitFor(() => {
    expect(publicInscribe).toHaveBeenCalledWith(
      'seminario-inovacao-2026',
      expect.objectContaining({
        userName: 'Maria Silva',
        userEmail: 'maria.silva@exemplo.com',
        formData: expect.objectContaining({ cargo: 'Engenheira de Software' }),
      })
    )
  })

  expect(await screen.findByText(/inscrição confirmada com sucesso!/i)).toBeInTheDocument()
  expect(screen.getAllByText('NOV02026').length).toBeGreaterThan(0)
  expect(screen.getByText(/apresente seu código no credenciamento/i)).toBeInTheDocument()
})
