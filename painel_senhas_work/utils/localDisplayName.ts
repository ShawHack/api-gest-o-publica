/**
 * NovoSGA costuma cadastrar guichês com tipo/nome "Sala".
 * Normaliza para o rótulo esperado no painel e na voz.
 */
export function resolveLocalDisplayName(localFromApi: string): string {
  const trimmed = localFromApi.trim()
  if (/^sala$/i.test(trimmed)) return 'Guichê'
  return trimmed
}
