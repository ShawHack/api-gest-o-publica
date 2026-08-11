import { render, screen } from '@testing-library/react'
import RuralOperatorPage from './RuralOperatorPage'
import RuralOwnerPage from './RuralOwnerPage'

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
  expect(screen.getByRole('heading', { name: /cadastro de proprietário rural/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/plus code/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/cpf do proprietário/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /criar acesso/i })).toBeInTheDocument()
})

test('proprietário inicia pela tela de login', () => {
  render(<RuralOwnerPage />)
  expect(screen.getByRole('heading', { name: /portal do produtor rural/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/plus code/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
})
