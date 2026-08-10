import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPartnerEntity } from '../../../services/educationService'
import { ENTITY_TYPE_LABELS, mediaUrl } from './educationUtils'
import styles from './EducationPortal.module.css'

export default function PartnerEntityProfile() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    getPartnerEntity(slug)
      .then(({ data: res }) => setData(res?.data || null))
      .catch(() => {
        setData(null)
        setError('Entidade não encontrada.')
      })
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div className={styles.loading}>Carregando...</div>
  if (error || !data) return <div className={styles.error}>{error || 'Não encontrado.'}</div>

  return (
    <>
      <p><Link to="/educacao/entidades-conveniadas">← Voltar para Entidades Conveniadas</Link></p>

      <div className={styles.profile_header}>
        {data.coverImageUrl && (
          <figure className={styles.profile_cover_frame}>
            <img src={mediaUrl(data.coverImageUrl)} alt="" className={styles.profile_cover_img} />
          </figure>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {data.logoUrl && (
            <img src={mediaUrl(data.logoUrl)} alt="" style={{ maxHeight: 72, borderRadius: 8 }} />
          )}
          <div>
            <span className={styles.badge}>Entidade conveniada</span>
            <span className={styles.badge} style={{ marginLeft: '0.35rem' }}>
              {ENTITY_TYPE_LABELS[data.type] || data.type}
            </span>
            <h2>{data.name}</h2>
          </div>
        </div>
        {data.description && <p style={{ marginTop: '1rem', lineHeight: 1.6 }}>{data.description}</p>}

        <div className={styles.meta_list}>
          {data.address && <div><strong>Endereço:</strong> {data.address}</div>}
          {data.phone && <div><strong>Telefone:</strong> {data.phone}</div>}
          {data.whatsapp && <div><strong>WhatsApp:</strong> {data.whatsapp}</div>}
          {data.email && (
            <div>
              <strong>E-mail:</strong>{' '}
              <a href={`mailto:${data.email}`}>{data.email}</a>
            </div>
          )}
          {data.openingHours && <div><strong>Horário de atendimento:</strong> {data.openingHours}</div>}
          {data.managerName && (
            <div>
              <strong>{data.managerRole || 'Responsável'}:</strong> {data.managerName}
            </div>
          )}
        </div>

        <p style={{ marginTop: '1rem' }}>
          <Link to={`/educacao/unidades/${data.slug}`} className={styles.section_link}>
            Ver página completa da unidade
          </Link>
        </p>
      </div>
    </>
  )
}
