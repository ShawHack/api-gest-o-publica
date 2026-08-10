import { useEffect, useState } from 'react'
import { listTransparency } from '../../../services/educationService'
import { formatDate, mediaUrl } from './educationUtils'
import styles from './EducationPortal.module.css'

const CATEGORY_LABELS = {
  prestacao_contas: 'Prestação de contas',
  aplicacao_recursos: 'Aplicação de recursos',
  fundeb: 'FUNDEB',
  alimentacao_escolar: 'Alimentação escolar',
  relatorio_institucional: 'Relatório institucional',
  indicador_educacional: 'Indicadores educacionais',
  documento_publico: 'Documento público',
}

export default function TransparencyList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = { limit: 20 }
    if (category) params.category = category
    listTransparency(params)
      .then(({ data }) => setItems(data?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [category])

  return (
    <>
      <h2 className={styles.section_title}>Transparência educacional</h2>
      <div className={styles.filters}>
        <label className={styles.field}>
          Categoria
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhum documento de transparência.</div>
      ) : (
        <div className={styles.card_row}>
          {items.map((item) => (
            <article key={item._id} className={styles.card}>
              <span className={styles.badge}>{CATEGORY_LABELS[item.category] || item.category}</span>
              <h3>
                <a href={mediaUrl(item.fileUrl)} target="_blank" rel="noopener noreferrer">{item.title}</a>
              </h3>
              <p className={styles.muted}>{formatDate(item.createdAt)}</p>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
