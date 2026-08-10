export const MODULE_OPTIONS = [
  { value: '', label: 'Todos os módulos' },
  { value: 'auth', label: 'Auth / Usuários' },
  { value: 'garca_pet', label: 'Garça Pet' },
  { value: 'memorial', label: 'Memorial' },
  { value: 'sama', label: 'SAMA' },
  { value: 'gov_cidadao', label: 'Garça Cidadão' },
  { value: 'votacao', label: 'Votação' },
  { value: 'lgpd', label: 'LGPD' },
  { value: 'forms', label: 'Formulários' },
  { value: 'api', label: 'API (geral)' },
]

export const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'VIEW', label: 'VIEW' },
  { value: 'DOWNLOAD', label: 'DOWNLOAD' },
  { value: 'UPLOAD', label: 'UPLOAD' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'LOGOUT', label: 'LOGOUT' },
  { value: 'SECURITY', label: 'SECURITY' },
  { value: 'APPROVE', label: 'APPROVE' },
  { value: 'REJECT', label: 'REJECT' },
  { value: 'OTHER', label: 'OTHER' },
]

export const CLIENT_APP_OPTIONS = [
  { value: '', label: 'Qualquer cliente' },
  { value: 'prefeitura_app', label: 'App Prefeitura (mobile)' },
  { value: 'gov_portal', label: 'Portal Gov (web)' },
]

export function moduleLabel(value) {
  const hit = MODULE_OPTIONS.find((o) => o.value === value)
  return hit?.label || value || '-'
}

export function statusColor(status) {
  if (status === 'denied') return '#b42318'
  if (status === 'error') return '#b54708'
  return '#027a48'
}
