'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { formatApiErrorMessage } from '../../lib/formatApiError'
import { stripSensitiveQueryParams } from '../../lib/stripSensitiveQuery'

const API = process.env.NEXT_PUBLIC_API_URL ?? '/garca-cidadao-api'
const FORCE_LOGIN_KEY = 'govForceLogin'
const LOGIN_LOGO_CANDIDATES = [
    '/garca-cidadao/logo_cidadao.png',
    '/logo_cidadao.png',
    '/garca-cidadao/logo_cidadao.svg',
    '/logo_cidadao.svg',
]

function getLegacyToken(): string {
    const rawToken = localStorage.getItem('token')
    if (rawToken) return rawToken

    const rawAuth = localStorage.getItem('auth')
    if (!rawAuth) return ''
    try {
        const auth = JSON.parse(rawAuth) as { token?: string }
        return auth?.token || ''
    } catch (_err) {
        return ''
    }
}

export default function GovCidadaoLoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [usingMainSession, setUsingMainSession] = useState(false)
    const [error, setError] = useState('')
    const [logoIndex, setLogoIndex] = useState(0)

    useEffect(() => {
        stripSensitiveQueryParams()
        const params = new URLSearchParams(window.location.search)
        const embedded = params.get('embedded') === '1' || params.get('from') === 'prefeitura_app'
        if (embedded) {
            sessionStorage.setItem('govEmbedded', '1')
            void enterWithMainSession()
            return
        }

        const token = localStorage.getItem('govToken')
        if (token) {
            window.location.href = '/garca-cidadao'
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap único no mount
    }, [])

    const enterWithMainSession = async () => {
        setError('')
        setUsingMainSession(true)
        try {
            const legacyToken = getLegacyToken()
            if (!legacyToken) {
                setError('Nenhuma sessão ativa do sistema principal foi encontrada.')
                return
            }
            const response = await fetch(`${API}/auth/me`, {
                headers: { Authorization: `Bearer ${legacyToken}` },
            })
            if (!response.ok) {
                setError('A sessão principal expirou. Entre com e-mail e senha.')
                return
            }
            localStorage.setItem('govToken', legacyToken)
            localStorage.removeItem(FORCE_LOGIN_KEY)
            window.location.href = '/garca-cidadao'
        } catch (_err) {
            setError('Falha ao validar a sessão do sistema principal.')
        } finally {
            setUsingMainSession(false)
        }
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                }),
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok) {
                setError(formatApiErrorMessage(payload?.detail) || 'Credenciais inválidas.')
                return
            }

            const token = payload?.access_token
            if (!token) {
                setError('Token não retornado pelo servidor.')
                return
            }

            localStorage.setItem('govToken', token)
            localStorage.removeItem(FORCE_LOGIN_KEY)
            window.location.href = '/garca-cidadao'
        } catch (_err) {
            setError('Falha de conexão com a API.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="garca-login-root" style={{
            minHeight: '100vh',
            background: '#eef2f7',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '1rem',
        }}>
            <style>{`
                .garca-login-root input,
                .garca-login-root textarea,
                .garca-login-root select {
                    color: #0f172a !important;
                    background: #f8fbff !important;
                    -webkit-text-fill-color: #0f172a !important;
                    caret-color: #0f172a !important;
                }
                .garca-login-root input::placeholder,
                .garca-login-root textarea::placeholder {
                    color: #64748b !important;
                    opacity: 1 !important;
                }
                .garca-login-root input:-webkit-autofill,
                .garca-login-root input:-webkit-autofill:hover,
                .garca-login-root input:-webkit-autofill:focus,
                .garca-login-root textarea:-webkit-autofill,
                .garca-login-root select:-webkit-autofill {
                    -webkit-text-fill-color: #0f172a !important;
                    box-shadow: 0 0 0px 1000px #f8fbff inset !important;
                    transition: background-color 9999s ease-out 0s !important;
                    caret-color: #0f172a !important;
                }
            `}</style>
            <div style={{ width: '100%', maxWidth: '980px', margin: '0 auto' }}>
                <div
                    style={{
                        background: 'linear-gradient(135deg, #3f51b5 0%, #4f67d8 100%)',
                        borderRadius: '12px',
                        minHeight: '150px',
                        padding: '24px 34px 34px',
                        display: 'flex',
                        justifyContent: 'flex-start',
                        alignItems: 'flex-start',
                        clipPath: 'polygon(0 0, 100% 0, 100% 76%, 0 100%)',
                        boxShadow: '0 12px 26px rgba(35, 52, 99, 0.18)',
                    }}
                >
                    <div style={{ display: 'grid', gap: '6px' }}>
                        <img
                            src={LOGIN_LOGO_CANDIDATES[logoIndex] ?? LOGIN_LOGO_CANDIDATES[0]}
                            alt="Garca Cidadao"
                            onError={() => setLogoIndex((prev) => Math.min(prev + 1, LOGIN_LOGO_CANDIDATES.length - 1))}
                            style={{ width: '230px', height: 'auto', objectFit: 'contain' }}
                        />
                    </div>
                </div>

                <div style={{
                    width: '100%',
                    maxWidth: '460px',
                    margin: '12px auto 0',
                    background: 'white',
                    borderRadius: '14px',
                    padding: '1.35rem',
                    border: '1px solid #dde4f0',
                    boxShadow: '0 10px 24px rgba(35, 52, 99, 0.12)',
                }}>
                    <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem' }}>Acesse o painel com sua conta</p>

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="E-mail"
                            required
                            style={{ padding: '0.65rem 0.75rem', border: '1px solid #ced8ea', borderRadius: '8px', background: '#f8faff' }}
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Senha"
                            required
                            style={{ padding: '0.65rem 0.75rem', border: '1px solid #ced8ea', borderRadius: '8px', background: '#f8faff' }}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.7rem 0.8rem',
                                border: 'none',
                                borderRadius: '8px',
                                background: '#3f51b5',
                                color: 'white',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>
                    <button
                        type="button"
                        disabled={loading || usingMainSession}
                        onClick={enterWithMainSession}
                        style={{
                            marginTop: '0.6rem',
                            width: '100%',
                            padding: '0.62rem 0.8rem',
                            border: '1px solid #c5d2f3',
                            borderRadius: '8px',
                            background: '#f3f6ff',
                            color: '#3f51b5',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        {usingMainSession ? 'Validando sessão...' : 'Entrar com sessão já ativa'}
                    </button>
                    <a
                        href="/garca-cidadao/register"
                        style={{
                            marginTop: '0.6rem',
                            width: '100%',
                            padding: '0.62rem 0.8rem',
                            border: '1px solid #d5deef',
                            borderRadius: '8px',
                            background: '#ffffff',
                            color: '#3f51b5',
                            fontWeight: 700,
                            textAlign: 'center',
                            textDecoration: 'none',
                            display: 'block',
                        }}
                    >
                        Não tem conta? Cadastre-se
                    </a>

                    {error && (
                        <div style={{
                            marginTop: '0.75rem',
                            background: '#fff1f2',
                            border: '1px solid #fda4af',
                            color: '#9f1239',
                            borderRadius: '8px',
                            padding: '0.65rem 0.75rem',
                            fontSize: '0.82rem',
                        }}>
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
