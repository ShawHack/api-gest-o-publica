export function excerpt(text, max = 140) {
  const value = String(text || '').trim()
  if (!value) return ''
  if (value.length <= max) return value
  return `${value.slice(0, max).trim()}…`
}
