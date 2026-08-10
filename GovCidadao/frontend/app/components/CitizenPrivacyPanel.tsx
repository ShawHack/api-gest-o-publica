'use client'

import { useState, type FormEvent } from 'react'
import { formatApiErrorMessage } from '../../lib/formatApiError'

type Props = {
    apiBase: string
    getHeaders: () => Record<string, string>
    userEmail: string
    onAccountDeleted: () => void
}

export function CitizenPrivacyPanel({ apiBase, getHeaders, userEmail, onAccountDeleted }: Props) {
    const [exporting, setExporting] = useState(false)
    const [exportMsg, setExportMsg] = useState('')
    const [password, setPassword] = useState('')
    const [confirmText, setConfirmText] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [deleteMsg, setDeleteMsg] = useState('')
    const [deleteError, setDeleteError] = useState('')

    const handleExport = async () => {
        setExportMsg('')
        setExporting(true)
        try {
            const res = await fetch(`${apiBase}/lgpd/me/export`, {
                headers: {
                    ...getHeaders(),
                    Accept: 'application/json',
                },
            })
            if (!res.ok) {
                const payload = await res.json().catch(() => null)
                setExportMsg(formatApiErrorMessage(payload?.detail) || 'Não foi possível exportar os dados.')
                return
            }
            const text = await res.text()
            const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `garca-cidadao-lgpd-${Date.now()}.json`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
            setExportMsg('Arquivo JSON baixado com sucesso.')
        } catch {
            setExportMsg('Falha de conexão com a API.')
        } finally {
            setExporting(false)
        }
    }

    const handleDelete = async (e: FormEvent) => {
        e.preventDefault()
        setDeleteError('')
        setDeleteMsg('')
        if (confirmText !== 'EXCLUIR') {
            setDeleteError('Digite exatamente EXCLUIR no campo de confirmação.')
            return
        }
        if (!password) {
            setDeleteError('Informe sua senha atual.')
            return
        }
        setDeleting(true)
        try {
            const res = await fetch(`${apiBase}/lgpd/me/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getHeaders(),
                },
                body: JSON.stringify({ confirm: 'EXCLUIR', password }),
            })
            const payload = await res.json().catch(() => null)
            if (!res.ok) {
                setDeleteError(
                    formatApiErrorMessage(payload?.detail) ||
                        (typeof payload?.message === 'string' ? payload.message : '') ||
                        'Não foi possível concluir a exclusão.',
                )
                return
            }
            setDeleteMsg(
                typeof payload?.message === 'string'
                    ? payload.message
                    : 'Dados anonimizados. Você será desconectado.',
            )
            setTimeout(() => onAccountDeleted(), 2500)
        } catch {
            setDeleteError('Falha de conexão com a API.')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="garca-privacy-panel">
            <div className="garca-privacy-card">
                <h2 className="garca-privacy-title">Seus dados (LGPD)</h2>
                <p className="garca-privacy-lead">
                    Você pode baixar uma cópia dos dados vinculados ao Garça Cidadão (ocorrências, notificações e
                    histórico) ou solicitar a anonimização da sua conta.
                </p>
                <p className="garca-privacy-meta">
                    Conta: <strong>{userEmail}</strong>
                </p>

                <section className="garca-privacy-section">
                    <h3>Exportar dados</h3>
                    <p>Gera um arquivo JSON com as informações associadas ao seu usuário neste sistema.</p>
                    <button
                        type="button"
                        className="garca-privacy-btn garca-privacy-btn--primary"
                        onClick={() => void handleExport()}
                        disabled={exporting}
                    >
                        {exporting ? 'Gerando arquivo…' : 'Baixar meus dados'}
                    </button>
                    {exportMsg && <p className="garca-privacy-msg">{exportMsg}</p>}
                </section>

                <section className="garca-privacy-section garca-privacy-section--danger">
                    <h3>Excluir / anonimizar conta</h3>
                    <p>
                        Esta ação remove sua identificação das reclamações e notificações no Garça Cidadão e anonimiza o
                        cadastro. Ocorrências já encaminhadas à Prefeitura podem permanecer sem dados pessoais. Esta
                        ação não pode ser desfeita.
                    </p>
                    <form onSubmit={(ev) => void handleDelete(ev)} className="garca-privacy-form">
                        <label>
                            Digite <strong>EXCLUIR</strong> para confirmar
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="EXCLUIR"
                                autoComplete="off"
                            />
                        </label>
                        <label>
                            Senha atual
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </label>
                        <button
                            type="submit"
                            className="garca-privacy-btn garca-privacy-btn--danger"
                            disabled={deleting}
                        >
                            {deleting ? 'Processando…' : 'Anonimizar minha conta'}
                        </button>
                    </form>
                    {deleteError && <p className="garca-privacy-error">{deleteError}</p>}
                    {deleteMsg && <p className="garca-privacy-msg">{deleteMsg}</p>}
                </section>
            </div>
        </div>
    )
}
