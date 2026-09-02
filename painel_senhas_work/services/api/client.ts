export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '')
  if (!trimmed) {
    throw new ApiError('URL da API NovoSGA não configurada', undefined)
  }
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

export async function apiRequest<T>(
  baseUrl: string,
  path: string,
  options: {
    method?: string
    token?: string | null
    body?: BodyInit | null
    headers?: Record<string, string>
    formUrlEncoded?: URLSearchParams
  } = {},
): Promise<T> {
  const endpoint = normalizeBaseUrl(baseUrl)
  const safePath = path.startsWith('/') ? path.replace(/\/+$/, '') || '/' : `/${path.replace(/\/+$/, '')}`
  const headers: Record<string, string> = { ...(options.headers ?? {}) }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  let body = options.body ?? null
  if (options.formUrlEncoded) {
    body = options.formUrlEncoded.toString()
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }
  }

  const url = `${endpoint}${safePath === '/' ? '' : safePath}`

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body,
      credentials: 'omit',
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'falha de rede'
    throw new ApiError(
      `Não foi possível alcançar o NovoSGA (${detail}). Verifique URL, rede e CORS.`,
    )
  }

  if (!response.ok) {
    let detail = response.statusText
    try {
      const data = (await response.json()) as { error_description?: string; error?: string }
      if (data.error_description) {
        detail = data.error_description
      } else if (data.error) {
        detail = data.error
      }
    } catch {
      // ignore
    }
    if (response.status === 400 || response.status === 401) {
      const isClient = /client authentication failed|invalid_client/i.test(detail)
      const isUser = /user credentials were incorrect|invalid_grant/i.test(detail)
      const hint = isClient
        ? 'Client ID ou Client Secret incorretos (não é usuário/senha). Copie de novo no NovoSGA → Admin → Aplicativos/API OAuth.'
        : isUser
          ? 'Usuário ou senha do NovoSGA incorretos.'
          : 'Confira Client ID, Client Secret, usuário e senha OAuth (os mesmos do app no Mangati).'
      throw new ApiError(`${response.status}: ${detail}. ${hint}`, response.status)
    }
    throw new ApiError(`${response.status}: ${detail}`, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
