import { fireEvent, render, screen } from '@testing-library/react'
import RuralAdminPage from './RuralAdminPage'
import { listRuralProperties, reviewRuralProperty } from '../../../services/ruralPortalService'

jest.mock('../../../context/UserContext', () => {
  const React = require('react')
  return { Context: React.createContext({ logout: jest.fn() }) }
})

jest.mock('../../../services/ruralPortalService', () => ({
  listRuralProperties: jest.fn(),
  reviewRuralProperty: jest.fn(),
}))

test('administrador aprova UPA pendente para publicação', async () => {
  listRuralProperties
    .mockResolvedValueOnce({ items: [{ _id: 'upa-1', codigoUpa: 'UPA-123', plusCode: '58M5Q8PW+9R', name: 'Sítio Teste' }] })
    .mockResolvedValueOnce({ items: [] })
  reviewRuralProperty.mockResolvedValue({ status: 'active' })

  render(<RuralAdminPage />)
  expect(await screen.findByText('UPA-123')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /aprovar/i }))

  expect(reviewRuralProperty).toHaveBeenCalledWith('upa-1', 'active')
  expect(await screen.findByText(/nenhuma upa aguardando/i)).toBeInTheDocument()
})
