import api from '../../../utils/api.js'
import { useState, useEffect, useCallback, useRef } from "react"
import { Link, useNavigate } from 'react-router-dom'
import styles from './Dashboard.module.css'
import RoundedImage from '../../layout/RoundedImage'
import useFlashMessage from "../../../hooks/useFlashMessage.js"
import useRole from "../../../hooks/useRole.js"

const LIMIT = 20

function MeusSepultados() {
  const [seps, setSeps] = useState([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const { setFlashMessage } = useFlashMessage()
  const navigate = useNavigate()

  const { roleLoaded, token, userId, isAdmin, isConcessionario } = useRole()

  // cache local de concessionários para resolver nome/email -> _id
  const consCacheRef = useRef(null)

 // ... dentro do componente MeusSepultados

// Em: MeusSepultados.js

// ...

// Em: frontend/src/components/pages/Sepultado/MeusSepultados.js

const fetchConcessionarios = useCallback(async () => {
  // MUDANÇA 1: Só use o cache se ele não estiver vazio.
  // Isso força uma nova busca se a busca anterior falhou.
  if (consCacheRef.current && consCacheRef.current.length > 0) {
    return consCacheRef.current;
  }

  try {
    const response = await api.get('/users/concessionarios', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = response.data;

    // MUDANÇA 2: Lógica de verificação robusta.
    if (data && Array.isArray(data.items)) {
      // Se a resposta for boa, salve no cache e retorne.
      consCacheRef.current = data.items;
      return data.items;
    } else {
      // Se a resposta não tiver o formato esperado, retorne um array vazio
      // mas NÃO salve no cache, para permitir uma nova tentativa.
      return [];
    }
  } catch (error) {
    // Se a chamada de API falhar, logue o erro e retorne um array vazio,
    // mas NÃO salve no cache.
    console.error("Falha na chamada API 'fetchConcessionarios':", error.response || error.message);
    return [];
  }
}, [token]);

// ...


// ... resto do código


  const resolveUserId = useCallback(async (input) => {
    const term = String(input || '').trim()
    if (!term) return { id: null, reason: 'Entrada vazia.' }

    // se já parecer um ObjectId (24 hex) deixamos como está
    if (/^[a-f0-9]{24}$/i.test(term)) return { id: term }

    const list = await fetchConcessionarios()
    if (!list.length) return { id: null, reason: 'Não foi possível listar concessionários.' }

    const norm = (s) => String(s || '').trim().toLowerCase()

    // busca por e-mail
    if (term.includes('@')) {
      const email = norm(term)
      const match = list.find(u => norm(u.email) === email)
      if (match) return { id: match._id }
      return { id: null, reason: `Nenhum concessionário com o e-mail "${term}".` }
    }

    // busca por nome: exato -> startsWith -> includes
    const name = norm(term)
    const exact = list.filter(u => norm(u.name) === name)
    if (exact.length === 1) return { id: exact[0]._id }
    if (exact.length > 1) {
      return {
        id: null,
        reason: `Mais de um usuário com o nome exato "${term}":\n- ` + exact.map(u => `${u.name} <${u.email || 'sem e-mail'}>`).join('\n- ')
      }
    }

    const starts = list.filter(u => norm(u.name).startsWith(name))
    if (starts.length === 1) return { id: starts[0]._id }
    if (starts.length > 1) {
      return {
        id: null,
        reason: `Vários nomes iniciando com "${term}":\n- ` + starts.map(u => `${u.name} <${u.email || 'sem e-mail'}>`).join('\n- ')
      }
    }

    const contains = list.filter(u => norm(u.name).includes(name))
    if (contains.length === 1) return { id: contains[0]._id }
    if (contains.length > 1) {
      return {
        id: null,
        reason: `Vários nomes contendo "${term}":\n- ` + contains.map(u => `${u.name} <${u.email || 'sem e-mail'}>`).join('\n- ')
      }
    }

    return { id: null, reason: `Nenhum usuário encontrado para "${term}".` }
  }, [fetchConcessionarios])

  const fetchList = useCallback(async (qArg = '', pageNum = 1) => {
    const qClean = (qArg || '').trim()
    const base = '/sepultados/meussepultados'
    const url = `${base}?q=${encodeURIComponent(qClean)}&page=${pageNum}&limit=${LIMIT}`

    try {
      const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = res.data

      // A API retorna: { sepults, page, limit, total, pages, q }
      if (Array.isArray(data?.sepults)) {
        setSeps(data.sepults)
        setPage(data.page || pageNum)
        setPages(data.pages || 1)
      } else if (Array.isArray(data)) {
        setSeps(data)
        setPage(1)
        setPages(1)
      } else if (Array.isArray(data?.sepultados)) {
        setSeps(data.sepultados)
        setPage(data.page || pageNum)
        setPages(data.pages || 1)
      } else {
        setSeps([])
        setPage(1)
        setPages(1)
      }
    } catch (err) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar sepultados.'
      if (status === 401) setFlashMessage("Sessão expirada ou não autenticado.", "error")
      else if (status === 403) setFlashMessage("Sem permissão para acessar esta lista.", "error")
      else setFlashMessage(msg, "error")
      setSeps([])
      setPage(1)
      setPages(1)
    }
  }, [token, setFlashMessage, isAdmin])

  useEffect(() => {
    if (!roleLoaded) return
    if (!(isAdmin || isConcessionario)) {
      setFlashMessage('Acesso restrito.', 'error')
      navigate('/')
      return
    }
    if (token) {
      setPage(1)
      fetchList('', 1)
    }
  }, [roleLoaded, isAdmin, isConcessionario, token, fetchList, navigate, setFlashMessage])

  function canEdit(sep) {
    if (isAdmin) return true
    if (isConcessionario) {
      const ids = (sep.concessionarios || []).map(String)
      return userId ? ids.includes(String(userId)) : false
    }
    return false
  }

  const canDelete = isAdmin
  const canAdd = isAdmin

  async function removeSepultado(id) {
    try {
      const res = await api.delete(`/sepultados/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSeps(prev => prev.filter(s => s._id !== id))
      setFlashMessage(res.data?.message || 'Removido com sucesso!', 'success')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao remover'
      setFlashMessage(msg, 'error')
    }
  }

  // ---------- ATUALIZADO: ATRIBUIR / DESATRIBUIR por nome OU e-mail ----------
  async function atribuirConcessionario(sepId) {
    const entrada = prompt('Digite o NOME completo ou E-MAIL do concessionário a atribuir:')
    if (!entrada) return
    const { id, reason } = await resolveUserId(entrada)
    if (!id) {
      alert(reason)
      return
    }
    try {
      const res = await api.patch(
        `/sepultados/${sepId}/atribuir/${encodeURIComponent(id)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setFlashMessage(res.data?.message || 'Concessionário atribuído com sucesso!', 'success')
      fetchList(q, page)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao atribuir concessionário.'
      setFlashMessage(msg, 'error')
    }
  }

  async function desatribuirConcessionario(sepId) {
    const entrada = prompt('Digite o NOME completo ou E-MAIL do concessionário a remover:')
    if (!entrada) return
    const { id, reason } = await resolveUserId(entrada)
    if (!id) {
      alert(reason)
      return
    }
    try {
      const res = await api.patch(
        `/sepultados/${sepId}/desatribuir/${encodeURIComponent(id)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setFlashMessage(res.data?.message || 'Concessionário removido com sucesso!', 'success')
      fetchList(q, page)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao remover atribuição.'
      setFlashMessage(msg, 'error')
    }
  }
  // --------------------------------------------------------------------------

  function onSubmitFilter(e) {
    e.preventDefault()
    setPage(1)
    fetchList(q, 1)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pages) {
      fetchList(q, newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (!roleLoaded) {
    return (
      <section>
        <h2>Gerenciamento de Sepultados</h2>
        <div className={styles.empty_state}>Carregando…</div>
      </section>
    )
  }

  return (
    <section>
      <h2>Gerenciamento de Sepultados</h2>

      <div className={styles.seplist_header}>
        {canAdd ? (
          <Link to="/sepultados/add">Novo Registro</Link>
        ) : (
          <span className={styles.helptext}>
            Você pode editar apenas os registros atribuídos a você. Para criar novos, fale com um administrador.
          </span>
        )}
      </div>

      <form onSubmit={onSubmitFilter} className={styles.filter_bar}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, rua, quadra ou chapa"
          className={styles.filter_input}
        />
        <button type="submit" className={styles.filter_button}>Pesquisar</button>
        {q && (
          <button type="button" className={styles.filter_button} onClick={() => { setQ(''); setPage(1); fetchList('', 1); }}>
            Limpar
          </button>
        )}
      </form>

      <div className={styles.seplist_container}>
        {seps.map((sepultado) => {
          const editar = canEdit(sepultado)

          const IMG_BASE = ''
          const raw = sepultado?.images?.[0]
          const cleaned = (typeof raw === 'string' ? raw : '').trim()
          const isBad = !cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '/'
          const srcImg = !isBad
            ? (cleaned.startsWith('http') ? cleaned : `${IMG_BASE}/images/sepultados/${cleaned}`)
            : '/sepultura-padrao.jpeg'

          return (
            <div className={styles.seplist_row} key={sepultado._id}>
              <RoundedImage src={srcImg} alt={sepultado.nome} width="px75" />
              <span className="bold">{sepultado.nome}</span>

              <div className={styles.actions}>
                {editar && <Link to={`/sepultados/edit/${sepultado._id}`}>Editar</Link>}
                {canDelete && (
                  <button onClick={() => removeSepultado(sepultado._id)}>
                    Excluir
                  </button>
                )}

                {/* botões de atribuição só para admin */}
                {isAdmin && (
                  <>
                    <button onClick={() => atribuirConcessionario(sepultado._id)}>
                      Atribuir
                    </button>
                    <button onClick={() => desatribuirConcessionario(sepultado._id)}>
                      Desatribuir
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {seps.length === 0 && (
          <div className={styles.empty_state}>Nenhum resultado para sua busca.</div>
        )}
      </div>

      {/* Controles de paginação */}
      {pages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '1rem',
          marginTop: '2rem',
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            style={{
              padding: '0.5rem 1rem',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.5 : 1,
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: '#fff'
            }}
          >
            Anterior
          </button>
          <span style={{ fontSize: '0.9em' }}>
            Página {page} de {pages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === pages}
            style={{
              padding: '0.5rem 1rem',
              cursor: page === pages ? 'not-allowed' : 'pointer',
              opacity: page === pages ? 0.5 : 1,
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: '#fff'
            }}
          >
            Próxima
          </button>
        </div>
      )}
    </section>
  )
}

export default MeusSepultados
