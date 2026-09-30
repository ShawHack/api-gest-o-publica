import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import FormsPublicEventPage from './FormsPublicEventPage'
import { getPublicEvent, publicInscribe } from '../../../services/formsGarcaService'

let mockSlug = 'teste-3'
jest.mock('react-router-dom', () => ({
  useParams: () => ({ slug: mockSlug }),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true })

jest.mock('../../../services/formsGarcaService', () => ({
  getPublicEvent: jest.fn(),
  publicInscribe: jest.fn(),
  publicUpload: jest.fn(),
}))

const event = {
  _id: 'form-1',
  titulo: 'Processo Seletivo para Programadores',
  slug: 'teste-3',
  status: 'aberto',
  situacao: 'disponivel',
  dataEvento: '2026-03-02T00:00:00.000Z',
  corPrimaria: '#1e3a8a',
  campos: [{ fieldId: 'cargo', label: 'Cargo', type: 'text', required: true }],
}

function renderPublic(path = '/formularios/evento/teste-3') {
  mockSlug = path.split('/').filter(Boolean).pop()
  return render(<FormsPublicEventPage />)
}

beforeEach(() => jest.clearAllMocks())

test('URL pública válida carrega o evento pelo slug sem autenticação', async () => {
  getPublicEvent.mockResolvedValue({ event })
  renderPublic()
  expect(await screen.findByRole('heading', { name: event.titulo })).toBeInTheDocument()
  expect(getPublicEvent).toHaveBeenCalledWith('teste-3')
  expect(screen.queryByText(/Memorial Santa Faustina/i)).not.toBeInTheDocument()
})

test('slug inexistente usa a página 404 padrão SEMIT e nunca o Memorial', async () => {
  getPublicEvent.mockRejectedValue({ response: { status: 404 } })
  renderPublic('/formularios/evento/inexistente')
  expect(await screen.findByRole('heading', { name: /página não localizada/i })).toBeInTheDocument()
  expect(screen.getByText(/Sistemas SEMIT/i)).toBeInTheDocument()
  expect(screen.queryByText(/Memorial Santa Faustina/i)).not.toBeInTheDocument()
})

test('erro interno exibe indisponibilidade sem redirecionar para outro módulo', async () => {
  getPublicEvent.mockRejectedValue({ response: { status: 500 } })
  renderPublic()
  expect(await screen.findByRole('heading', { name: /conteúdo temporariamente indisponível/i })).toBeInTheDocument()
  expect(screen.queryByText(/Memorial Santa Faustina/i)).not.toBeInTheDocument()
})

test('envia os dados pessoais e respostas usando o contrato público vigente', async () => {
  getPublicEvent.mockResolvedValue({ event })
  publicInscribe.mockResolvedValue({ inscription: { voucherCode: 'ABC12345', mensagemConfirmacao: 'Tudo certo.' } })
  renderPublic()
  await screen.findByRole('heading', { name: event.titulo })

  fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Maria Teste' } })
  fireEvent.change(screen.getByLabelText(/^e-mail/i), { target: { value: 'maria@example.com' } })
  fireEvent.change(screen.getByLabelText(/cargo/i), { target: { value: 'Desenvolvedora' } })
  fireEvent.click(screen.getByRole('button', { name: /confirmar inscrição/i }))

  await waitFor(() => expect(publicInscribe).toHaveBeenCalledWith('teste-3', expect.objectContaining({
    userName: 'Maria Teste',
    userEmail: 'maria@example.com',
    formData: { cargo: 'Desenvolvedora' },
  })))
  expect(await screen.findByText('ABC12345')).toBeInTheDocument()
})
