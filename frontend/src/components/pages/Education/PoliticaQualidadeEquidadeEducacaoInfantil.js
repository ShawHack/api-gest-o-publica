import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listEarlyChildhoodPolicies } from '../../../services/educationService'
import PdfDocList from './PdfDocList'
import styles from './EducationPortal.module.css'

export default function PoliticaQualidadeEquidadeEducacaoInfantil() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    listEarlyChildhoodPolicies({ limit: 100 })
      .then(({ data }) => setItems(data?.data || []))
      .catch(() => {
        setItems([])
        setError('Não foi possível carregar a Política Municipal de Qualidade e Equidade da Educação Infantil.')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <p>
        <Link to="/educacao">← Voltar ao início</Link>
      </p>

      <h2 className={styles.section_title}>
        Política Municipal de Qualidade e Equidade da Educação Infantil
      </h2>
      <p className={styles.section_lead}>
        Documentos da Política Municipal de Qualidade e Equidade da Educação Infantil,
        listados do mais recente para o mais antigo. Clique no card para abrir o PDF.
      </p>

      {loading && <div className={styles.loading}>Carregando...</div>}
      {error && !loading && <div className={styles.error}>{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className={styles.empty}>
          <p>Nenhum documento publicado ainda.</p>
          <p className={styles.muted}>
            A Secretaria Municipal de Educação disponibilizará os arquivos em breve.
          </p>
        </div>
      )}

      {!loading && !error && <PdfDocList items={items} />}
    </>
  )
}
