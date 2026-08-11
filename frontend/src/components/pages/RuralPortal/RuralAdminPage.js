import { useCallback, useEffect, useState } from 'react'
import { listRuralProperties, reviewRuralProperty } from '../../../services/ruralPortalService'
import RuralNavbar from './RuralNavbar'
import styles from './RuralPortal.module.css'

const messageOf = (error) => error?.response?.data?.message || 'Não foi possível carregar as UPAs.'

export default function RuralAdminPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setItems((await listRuralProperties('pending_review')).items || []) }
    catch (requestError) { setError(messageOf(requestError)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function review(id, status) {
    setError('')
    try { await reviewRuralProperty(id, status); await load() }
    catch (requestError) { setError(messageOf(requestError)) }
  }

  return <div className={styles.appShell}>
    <RuralNavbar section="Revisão de UPAs" />
    <main className={styles.page}><section className={styles.card}>
      <header className={styles.header}><h1>UPAs aguardando revisão</h1><p>Aprove apenas após conferir o código, o Plus Code e a propriedade.</p></header>
      {loading && <p>Carregando...</p>}
      {error && <div role="alert" className={styles.error}>{error}</div>}
      {!loading && !items.length && <div className={styles.success}>Nenhuma UPA aguardando revisão.</div>}
      <div className={styles.reviewList}>{items.map((item) => <article className={styles.reviewItem} key={item._id}>
        <div><strong>{item.codigoUpa}</strong><span>{item.name || 'Propriedade sem nome'}</span><code>{item.plusCode}</code></div>
        <div className={styles.actions}>
          <button className={styles.button} onClick={() => review(item._id, 'active')}>Aprovar</button>
          <button className={styles.buttonDanger} onClick={() => review(item._id, 'inactive')}>Rejeitar</button>
        </div>
      </article>)}</div>
    </section></main>
  </div>
}
