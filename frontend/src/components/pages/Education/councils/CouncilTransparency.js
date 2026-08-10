import { useEffect, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { listTransparency } from '../../../../services/educationService'
import { formatDate, mediaUrl } from '../educationUtils'
import styles from '../EducationPortal.module.css'

const TRANSPARENCY_LABELS = {
  prestacao_contas: 'Prestação de contas',
  aplicacao_recursos: 'Aplicação de recursos',
  fundeb: 'FUNDEB',
  alimentacao_escolar: 'Alimentação escolar',
  relatorio_institucional: 'Relatório institucional',
  indicador_educacional: 'Indicadores educacionais',
  documento_publico: 'Documento público',
}

export default function CouncilTransparency() {
  const { slug } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const category = searchParams.get('category') || ''

  useEffect(() => {
    setLoading(true)
    const params = { entitySlug: slug, limit: 30 }
    if (category) params.category = category
    listTransparency(params)
      .then(({ data }) => setItems(data?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [slug, category])

  return (
    <section className={styles.council_section}>
      <p className={styles.section_lead}>
        Documentos de transparência e prestação de contas do conselho.
      </p>
      <div className={styles.doc_filters}>
        <label className={styles.field}>
          Categoria
          <select
            value={category}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams)
              if (e.target.value) next.set('category', e.target.value)
              else next.delete('category')
              setSearchParams(next)
            }}
          >
            <option value="">Todas</option>
            {Object.entries(TRANSPARENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhum documento de transparência.</div>
      ) : (
        <ul className={styles.doc_list}>
          {items.map((doc) => (
            <li key={doc._id}>
              <article className={styles.doc_list_item}>
                <span className={styles.badge}>
                  {TRANSPARENCY_LABELS[doc.category] || doc.category}
                </span>
                <h4>
                  <a href={mediaUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer">
                    {doc.title}
                  </a>
                </h4>
                <p className={styles.muted}>{formatDate(doc.publishedAt || doc.createdAt)}</p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
