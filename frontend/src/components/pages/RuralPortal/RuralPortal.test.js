import { fireEvent, render, screen } from '@testing-library/react'
import RuralOperatorPage, { copyText } from './RuralOperatorPage'
import RuralOwnerPage from './RuralOwnerPage'
import { getRuralProfile, listManagedRuralProperties, resolveRuralProperty } from '../../../services/ruralPortalService'

jest.mock('../../../services/ruralPortalService', () => ({
  createRuralOwner: jest.fn(),
  resolveRuralProperty: jest.fn(),
  ruralLogin: jest.fn(),
  changeRuralPassword: jest.fn(),
  getRuralProfile: jest.fn(),
  saveRuralProfile: jest.fn(),
  listManagedRuralProperties: jest.fn(),
  updateManagedRuralProperty: jest.fn(),
  deleteManagedRuralProperty: jest.fn(),
}))

beforeEach(() => {
  sessionStorage.clear()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      features: [{
        properties: { name: 'Venda Seca' },
        geometry: { type: 'Polygon', coordinates: [[[-49.9, -22.3], [-49.8, -22.3], [-49.8, -22.2], [-49.9, -22.3]]] },
      }],
    }),
  })
})

test('operador visualiza os campos essenciais', () => {
  render(<RuralOperatorPage />)
  expect(screen.getByRole('img', { name: /estradas rurais/i })).toHaveAttribute('src', '/banner-estradas.png')
  expect(screen.getByRole('heading', { name: /cadastro de proprietário rural/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/plus code/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/cpf do proprietário/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /criar acesso/i })).toBeInTheDocument()
})

test('operador abre o gerenciamento de propriedades', async () => {
  listManagedRuralProperties.mockResolvedValue({ items: [{ _id: 'upa-1', name: 'Sítio Teste', codigoUpa: 'UPA-001', plusCode: '58M5+CFGH', status: 'active', account: { cpfLast4: '1234' } }] })
  render(<RuralOperatorPage />)
  fireEvent.click(screen.getByRole('tab', { name: /gerenciar propriedades/i }))
  expect(await screen.findByText('Sítio Teste')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument()
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
  fireEvent.click(await screen.findByRole('button', { name: /selecionar bairro venda seca/i }))
  expect(neighborhood).toHaveValue('Venda Seca')
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
