import { render, screen } from '@testing-library/react'
import NotFoundPage from './NotFoundPage'

jest.mock('react-router-dom', () => ({ Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true })

test('exibe erro genérico dos Sistemas SEMIT', () => {
  render(<NotFoundPage />)
  expect(screen.getByRole('heading', { name: /página não localizada/i })).toBeInTheDocument()
  expect(screen.getByText(/sistemas semit/i)).toBeInTheDocument()
  expect(screen.queryByText(/memorial santa faustina/i)).not.toBeInTheDocument()
})
