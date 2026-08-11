import { fireEvent, render, screen } from '@testing-library/react'
import RuralOperatorPage, { copyText } from './RuralOperatorPage'
import RuralOwnerPage from './RuralOwnerPage'
import { getRuralProfile, resolveRuralProperty } from '../../../services/ruralPortalService'

jest.mock('../../../services/ruralPortalService', () => ({
  createRuralOwner: jest.fn(),
  resolveRuralProperty: jest.fn(),
  ruralLogin: jest.fn(),
  changeRuralPassword: jest.fn(),
  getRuralProfile: jest.fn(),
  saveRuralProfile: jest.fn(),
}))

beforeEach(() => sessionStorage.clear())

test('operador visualiza os campos essenciais', () => {
  render(<RuralOperatorPage />)
  expect(screen.getByRole('img', { name: /estradas rurais/i })).toHaveAttribute('src', '/banner-estradas.png')
  expect(screen.getByRole('heading', { name: /cadastro de proprietário rural/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/plus code/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/cpf do proprietário/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /criar acesso/i })).toBeInTheDocument()
})

test('proprietário inicia pela tela de login', () => {
  render(<RuralOwnerPage />)
  expect(screen.getAllByText(/portal do produtor/i).length).toBeGreaterThan(0)
  expect(screen.getByRole('heading', { name: /portal do produtor rural/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/plus code/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
})

test('formulário do proprietário contém bairro rural', async () => {
  sessionStorage.setItem('rural_portal_token', 'token-teste')
  getRuralProfile.mockResolvedValue({
    account: { mustChangePassword: false },
    property: {},
    profile: null,
  })
  render(<RuralOwnerPage />)
  const neighborhood = await screen.findByLabelText(/bairro rural/i)
  expect(neighborhood.tagName).toBe('SELECT')
  expect(screen.getByRole('option', { name: 'Venda Seca' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Água da Prata / Adrianita' })).toBeInTheDocument()
})

test('operador pode cadastrar quando o Plus Code não está no catálogo', async () => {
  resolveRuralProperty.mockResolvedValue({ found: false, catalogAvailable: true })
  render(<RuralOperatorPage />)
  fireEvent.change(screen.getByLabelText(/plus code/i), { target: { value: '7FG8+CFGH' } })
  fireEvent.click(screen.getByRole('button', { name: /consultar upa/i }))
  expect(await screen.findByText(/plus code não cadastrado/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/código da upa/i)).toBeRequired()
})

test('catálogo indisponível libera cadastro manual pendente de revisão', async () => {
  resolveRuralProperty.mockResolvedValue({ found: false, catalogAvailable: false })
  render(<RuralOperatorPage />)
  fireEvent.change(screen.getByLabelText(/plus code/i), { target: { value: '7FG8+CFGH' } })
  fireEvent.click(screen.getByRole('button', { name: /consultar upa/i }))
  expect(await screen.findByText(/catálogo temporariamente indisponível/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/código da upa/i)).toBeRequired()
})

test('cópia usa alternativa segura quando Clipboard API não existe', async () => {
  const originalClipboard = navigator.clipboard
  const originalExecCommand = document.execCommand
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
  document.execCommand = jest.fn(() => true)

  await expect(copyText('Usuário: teste')).resolves.toBe(true)
  expect(document.execCommand).toHaveBeenCalledWith('copy')

  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard })
  document.execCommand = originalExecCommand
})
