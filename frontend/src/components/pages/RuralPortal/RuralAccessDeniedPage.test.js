import { fireEvent, render, screen } from '@testing-library/react'
import { Context } from '../../../context/UserContext'
import RuralAccessDeniedPage from './RuralAccessDeniedPage'

jest.mock('../../../context/UserContext', () => {
  const React = require('react')
  return { Context: React.createContext({}) }
})

test('troca de conta encerra a sessão e abre o login de Estradas Rurais', () => {
  const logout = jest.fn()
  render(<Context.Provider value={{ logout }}><RuralAccessDeniedPage /></Context.Provider>)
  fireEvent.click(screen.getByRole('button', { name: /entrar com outra conta/i }))
  expect(logout).toHaveBeenCalledWith('/rotas-rurais/login')
})
