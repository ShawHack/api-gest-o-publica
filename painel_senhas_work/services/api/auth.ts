import type { OAuthTokens, SessionCredentials } from '../../types/config'
import type { NovoSgaTokenResponse } from '../../types/novosga'
import { tokenResponseSchema } from './adapters/schemas'
import { apiRequest } from './client'

export async function requestPasswordToken(
  apiUrl: string,
  credentials: SessionCredentials,
): Promise<OAuthTokens> {
  const params = new URLSearchParams()
  params.set('grant_type', 'password')
  params.set('client_id', credentials.clientId)
  params.set('client_secret', credentials.clientSecret)
  params.set('username', credentials.username)
  params.set('password', credentials.password)

  const raw = await apiRequest<NovoSgaTokenResponse>(apiUrl, '/token', {
    method: 'POST',
    formUrlEncoded: params,
  })

  const data = tokenResponseSchema.parse(raw)
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  }
}

export async function refreshAccessToken(
  apiUrl: string,
  credentials: Pick<SessionCredentials, 'clientId' | 'clientSecret'>,
  refreshToken: string,
): Promise<OAuthTokens> {
  const params = new URLSearchParams()
  params.set('grant_type', 'refresh_token')
  params.set('client_id', credentials.clientId)
  params.set('client_secret', credentials.clientSecret)
  params.set('refresh_token', refreshToken)

  const raw = await apiRequest<NovoSgaTokenResponse>(apiUrl, '/token', {
    method: 'POST',
    formUrlEncoded: params,
  })

  const data = tokenResponseSchema.parse(raw)
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  }
}
