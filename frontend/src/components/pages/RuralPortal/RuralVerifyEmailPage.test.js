import { render, screen } from '@testing-library/react'
import api from '../../../utils/api'
import RuralVerifyEmailPage from './RuralVerifyEmailPage'

jest.mock('react-router-dom', () => {
  const React = require('react')
  return {
    useLocation: () => ({ search: '?token=abc&email=maria%40teste.local' }),
    Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  }
}, { virtual: true })
jest.mock('../../../utils/api', () => ({ get: jest.fn() }))
jest.mock('../../../context/UserContext', () => {
  const React = require('react')
  return { Context: React.createContext({}) }
})

test('confirma o e-mail e oferece o login rural', async () => {
  api.get.mockResolvedValue({ data: { message: 'E-mail verificado com sucesso.' } })
  render(<RuralVerifyEmailPage />)
  expect(await screen.findByText(/solicitação aguarda a permissão/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /ir para o login/i })).toHaveAttribute('href', '/rotas-rurais/login')
  expect(api.get).toHaveBeenCalledWith('/users/verify-email', { params: { token: 'abc', email: 'maria@teste.local' } })
})
