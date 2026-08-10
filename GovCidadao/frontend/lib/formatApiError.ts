/** Normaliza `detail` do FastAPI (string | objeto | array) para mensagem única. */
export function formatApiErrorMessage(detail: unknown): string {
    if (detail == null) return 'Erro na requisição.'
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
        const parts = detail
            .map((item) => {
                if (item == null) return ''
                if (typeof item === 'string') return item
                if (typeof item === 'object' && item !== null && 'msg' in item) {
                    const msg = (item as { msg?: string }).msg
                    return typeof msg === 'string' ? msg : JSON.stringify(item)
                }
                return JSON.stringify(item)
            })
            .filter(Boolean)
        return parts.length ? parts.join(' ') : 'Erro na requisição.'
    }
    if (typeof detail === 'object') return JSON.stringify(detail)
    return String(detail)
}
