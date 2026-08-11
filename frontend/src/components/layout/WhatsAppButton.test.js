import { render, screen } from '@testing-library/react'
import WhatsAppButton from './WhatsAppButton'

let mockPathname = '/'
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: mockPathname }),
}), { virtual: true })

test.each([
  '/rotas-rurais/operador',
  '/rotas-rurais/proprietario',
])('não exibe WhatsApp no módulo rural: %s', (route) => {
  mockPathname = route
  render(<WhatsAppButton />)
  expect(screen.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument()
})

test('mantém WhatsApp em uma rota comum', () => {
  mockPathname = '/sepulturas'
  render(<WhatsAppButton />)
  expect(screen.getByRole('link', { name: /whatsapp/i })).toBeInTheDocument()
})
