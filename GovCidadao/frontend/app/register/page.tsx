'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { formatApiErrorMessage } from '../../lib/formatApiError'

const API = process.env.NEXT_PUBLIC_API_URL ?? '/garca-cidadao-api'
const FORCE_LOGIN_KEY = 'govForceLogin'
const LOGO_CANDIDATES = [
    '/garca-cidadao/logo_cidadao.png',
    '/logo_cidadao.png',
    '/garca-cidadao/logo_cidadao.svg',
    '/logo_cidadao.svg',
]

function digitsOnly(value: string): string {
    return value.replace(/\D/g, '')
}

export default function GovCidadaoRegisterPage() {
    const [name, setName] = useState('')
    const [cpf, setCpf] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [logoIndex, setLogoIndex] = useState(0)

    useEffect(() => {
        const token = localStorage.getItem('govToken')
        if (token) window.location.href = '/garca-cidadao'
    }, [])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')

        if (!name.trim() || !email.trim() || !cpf.trim() || !phone.trim() || !password || !confirmPassword) {
            setError('Preencha todos os campos obrigatórios.')
            return
        }
        if (password !== confirmPassword) {
            setError('Senha e confirmação não conferem.')
            return
        }
        if (!acceptedTerms) {
            setError('Aceite os termos de uso para continuar.')
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`${API}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    cpf: digitsOnly(cpf),
                    phone: digitsOnly(phone),
                    email: email.trim().toLowerCase(),
                    password,
                    confirm_password: confirmPassword,
                    accepted_terms: acceptedTerms,
                }),
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok) {
                setError(formatApiErrorMessage(payload?.detail) || 'Falha ao cadastrar usuário.')
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
                <div style={{
                    background: 'linear-gradient(135deg, #3f51b5 0%, #4f67d8 100%)',
                    borderRadius: '12px',
                    minHeight: '150px',
                    padding: '24px 34px 34px',
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                    clipPath: 'polygon(0 0, 100% 0, 100% 76%, 0 100%)',
                    boxShadow: '0 12px 26px rgba(35, 52, 99, 0.18)',
                }}>
                    <div style={{ display: 'grid', gap: '6px' }}>
                        <img
                            src={LOGO_CANDIDATES[logoIndex] ?? LOGO_CANDIDATES[0]}
                            alt="Garca Cidadao"
                            onError={() => setLogoIndex((prev) => Math.min(prev + 1, LOGO_CANDIDATES.length - 1))}
                            style={{ width: '230px', height: 'auto', objectFit: 'contain' }}
                        />
                    </div>
                </div>

                <div style={{
                    width: '100%',
                    maxWidth: '540px',
                    margin: '12px auto 0',
                    background: 'white',
                    borderRadius: '14px',
                    padding: '1.35rem',
                    border: '1px solid #dde4f0',
                    boxShadow: '0 10px 24px rgba(35, 52, 99, 0.12)',
                }}>
                    <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem' }}>Cadastro de usuário</p>

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nome"
                            required
                            style={{ padding: '0.65rem 0.75rem', border: '1px solid #ced8ea', borderRadius: '8px', background: '#f8faff' }}
                        />
                        <input
                            type="text"
                            value={cpf}
                            onChange={(e) => setCpf(e.target.value)}
                            placeholder="Digite o seu CPF"
                            required
                            style={{ padding: '0.65rem 0.75rem', border: '1px solid #ced8ea', borderRadius: '8px', background: '#f8faff' }}
                        />
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Digite o seu telefone"
                            required
                            style={{ padding: '0.65rem 0.75rem', border: '1px solid #ced8ea', borderRadius: '8px', background: '#f8faff' }}
                        />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Digite o seu e-mail"
                            required
                            style={{ padding: '0.65rem 0.75rem', border: '1px solid #ced8ea', borderRadius: '8px', background: '#f8faff' }}
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Digite sua senha"
                            required
                            style={{ padding: '0.65rem 0.75rem', border: '1px solid #ced8ea', borderRadius: '8px', background: '#f8faff' }}
                        />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirme sua senha"
                            required
                            style={{ padding: '0.65rem 0.75rem', border: '1px solid #ced8ea', borderRadius: '8px', background: '#f8faff' }}
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#334155' }}>
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                            />
                            Li e concordo com os Termos de Uso.
                        </label>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.7rem 0.8rem',
                                border: 'none',
                                borderRadius: '8px',
                                background: '#e58f4b',
                                color: 'white',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            {loading ? 'Cadastrando...' : 'Cadastrar'}
                        </button>
                    </form>

                    <div style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                        Já tem conta? <a href="/garca-cidadao/login" style={{ color: '#3f51b5', fontWeight: 600 }}>Clique aqui</a>
                    </div>

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
