import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, CENTRAL_LOGIN_PATH, clearToken, readToken, storeToken } from './api'

describe('sessão central da Agenda Garça', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks() })

  it('reutiliza token central nos dois formatos suportados', () => {
    expect(CENTRAL_LOGIN_PATH).toBe('/api/users/login')
    storeToken('"jwt-central"')
    expect(readToken()).toBe('jwt-central')
    expect(localStorage.getItem('token')).toBe('jwt-central')
    expect(JSON.parse(localStorage.getItem('auth')).token).toBe('jwt-central')
    clearToken()
    expect(readToken()).toBe('')
  })

  it('envia Bearer central e propaga mensagem segura da API', async () => {
    storeToken('jwt-central')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ identitySource: 'users' }),
    })
    await expect(api('/api/agenda/me')).resolves.toEqual({ identitySource: 'users' })
    expect(fetchMock).toHaveBeenCalledWith('/api/agenda/me', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer jwt-central' }),
    }))

    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ message: 'Sem permissão.' }) })
    await expect(api('/api/agenda/admin/units')).rejects.toThrow('Sem permissão.')
  })
})
