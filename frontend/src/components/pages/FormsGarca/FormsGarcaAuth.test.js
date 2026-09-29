import { render, screen } from '@testing-library/react'
import { Context } from '../../../context/UserContext'
import FormsGarcaLoginPage from './FormsGarcaLoginPage'
import FormsGarcaRegisterPage from './FormsGarcaRegisterPage'

jest.mock('../../../context/UserContext', () => ({ Context: require('react').createContext({}) }))
jest.mock('../../../utils/api', () => ({ post: jest.fn() }))

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ state: null }),
  useNavigate: () => jest.fn(),
}), { virtual: true })

test('exibe a identidade e as ações da tela de login', () => {
  render(<Context.Provider value={{ login: jest.fn() }}><FormsGarcaLoginPage /></Context.Provider>)
  expect(screen.getAllByAltText('SEMIT Formulários')).toHaveLength(2)
  expect(screen.getByRole('heading', { name: 'Bem-vindo' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Criar cadastro' })).toHaveAttribute('href', '/formularios/cadastro')
})

test('exibe os campos essenciais e os termos no cadastro', () => {
  render(<FormsGarcaRegisterPage />)
  expect(screen.getByRole('heading', { name: 'Criar cadastro' })).toBeInTheDocument()
  expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
  expect(screen.getByLabelText('CPF')).toBeInTheDocument()
  expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Termos de Uso' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Criar minha conta' })).toBeInTheDocument()
})
