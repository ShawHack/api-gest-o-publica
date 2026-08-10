/** Remove token/access_token da barra de endereço (evita vazamento em histórico/referrer). */
export function stripSensitiveQueryParams(): void {
    if (typeof window === 'undefined') return
    try {
        const url = new URL(window.location.href)
        const sensitive = ['token', 'access_token', 'auth_token', 'jwt']
        let changed = false
        for (const key of sensitive) {
            if (url.searchParams.has(key)) {
                url.searchParams.delete(key)
                changed = true
            }
        }
        if (changed) {
            const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash
            window.history.replaceState({}, '', next)
        }
    } catch (_err) {
        // noop
    }
}
