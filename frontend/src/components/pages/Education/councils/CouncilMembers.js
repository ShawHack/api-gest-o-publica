import { useOutletContext } from 'react-router-dom'
import { MEMBER_ROLE_LABELS, MEMBER_SEGMENT_LABELS } from '../councilUtils'
import { formatDate } from '../educationUtils'
import styles from '../EducationPortal.module.css'

export default function CouncilMembers() {
  const { council } = useOutletContext()
  const members = council.members || []

  if (members.length === 0) {
    return <div className={styles.empty}>Composição do conselho em atualização.</div>
  }

  const titulares = members.filter((m) => m.isTitular !== false)
  const suplentes = members.filter((m) => m.isTitular === false)

  function renderGroup(title, list) {
    if (!list.length) return null
    return (
      <>
        <h3 className={styles.subsection_title}>{title}</h3>
        <div className={styles.member_grid}>
          {list.map((member) => (
            <article key={member._id} className={styles.member_card}>
              <h4>{member.name}</h4>
              <p className={styles.badge}>
                {MEMBER_ROLE_LABELS[member.role] || member.role}
              </p>
              <p className={styles.muted}>
                {MEMBER_SEGMENT_LABELS[member.segment] || member.segment}
              </p>
              {member.mandateStart && (
                <p className={styles.muted}>
                  Mandato: {formatDate(member.mandateStart)}
                  {member.mandateEnd ? ` — ${formatDate(member.mandateEnd)}` : ''}
                </p>
              )}
              {member.email && <p className={styles.muted}>{member.email}</p>}
            </article>
          ))}
        </div>
      </>
    )
  }

  return (
    <section className={styles.council_section}>
      <p className={styles.section_lead}>
        Composição atual do conselho, conforme segmentos e mandatos vigentes.
      </p>
      {renderGroup('Membros titulares', titulares)}
      {renderGroup('Membros suplentes', suplentes)}
    </section>
  )
}
