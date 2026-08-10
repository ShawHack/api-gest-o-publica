// src/components/pages/sepultados/AddSepultado.js
import styles from './AddSepultado.module.css'
import api from '../../../utils/api'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// components
import SepultadoForm from '../../form/SepultadoForm'

// hooks
import useFlashMessage from '../../../hooks/useFlashMessage'

function readTokenLS() {
  const fromAuth = JSON.parse(localStorage.getItem('auth') || '{}')?.token
  if (fromAuth) return fromAuth
  const raw = localStorage.getItem('token')
  if (!raw) return ''
  try { return JSON.parse(raw) } catch { return raw.replace(/^"+|"+$/g, '') }
}

function normalizeRole(anyRole) {
  return String(anyRole ?? 'usuario').trim().toLowerCase()
}

function AddSepultado() {
  const navigate = useNavigate()
  const { setFlashMessage } = useFlashMessage()

  const token = useMemo(() => readTokenLS(), [])
  const [role, setRole] = useState('usuario')

  // flags de permissão
  const isAdmin = role === 'admin'
  const canCriar = role === 'admin' || role === 'concessionario'

  // lista para o select (apenas admin vê)
  const [concessionarios, setConcessionarios] = useState([]) // [{_id,name,email}]

  // guarda de acesso + papel
  useEffect(() => {
    if (!token) {
      setFlashMessage('Você precisa estar logado.', 'error')
      navigate('/')
      return
    }

    api
      .get('/users/checkuser', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        // tenta múltiplos caminhos e normaliza
        const r = normalizeRole(
          res?.data?.role ??
          res?.data?.user?.role ??
          (Array.isArray(res?.data?.roles) ? res.data.roles[0] : undefined)
        )

        setRole(r)

        if (!('admin' === r || 'concessionario' === r)) {
          setFlashMessage(
            'Acesso restrito: somente administradores ou concessionários podem criar sepultados.',
            'error'
          )
          navigate('/')
        }
      })
      .catch(() => {
        setFlashMessage('Sessão inválida. Faça login novamente.', 'error')
        navigate('/')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // carregar lista de concessionários se admin (para o select múltiplo no formulário)
  useEffect(() => {
    if (!isAdmin) return
    api
      .get('/users/concessionarios', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const items = Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res?.data)
          ? res.data
          : []
        setConcessionarios(items)
      })
      .catch(() => setConcessionarios([]))
  }, [isAdmin, token])

  // recebe (payload, { isFormData }) do SepultadoForm
  const registerSepultado = useCallback(
    async (payload, { isFormData }) => {
      try {
        if (!canCriar) {
          setFlashMessage('Você não tem permissão para criar sepultados.', 'error')
          return
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        }

        const res = await api.post('sepultados/create', payload, { headers })

        setFlashMessage(res?.data?.message || 'Criado com sucesso!', 'success')
        navigate('/sepultados/meumemorial')
      } catch (err) {
        const msg = err?.response?.data?.message || 'Erro ao criar sepultado'
        setFlashMessage(msg, 'error')
      }
    },
    [token, navigate, setFlashMessage, canCriar]
  )

  return (
    <section className={styles.addsep_header}>
      <div>
        <h2>Criação de Memorial</h2>
        <p>
          Após o registro, o ente ficará disponível para localização dentro do
          cemitério e poderá receber futuras homenagens de amigos e familiares.
        </p>
      </div>

      {/* Para admin: mostra select múltiplo de concessionários.
          Para concessionário: o formulário não mostra o select (isAdmin=false),
          e você pode preencher o vínculo no backend usando o próprio usuário do token. */}
      <SepultadoForm
        handleSubmit={registerSepultado}
        btnText="Cadastrar"
        concessionariosDisponiveis={concessionarios}
        isAdmin={isAdmin}
      />
    </section>
  )
}

export default AddSepultado
