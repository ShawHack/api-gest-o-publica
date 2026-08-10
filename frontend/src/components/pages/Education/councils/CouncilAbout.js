import { useOutletContext } from 'react-router-dom'
import styles from '../EducationPortal.module.css'

export default function CouncilAbout() {
  const { council } = useOutletContext()

  return (
    <section className={styles.council_section}>
      <h3 className={styles.subsection_title}>Apresentação institucional</h3>
      {council.institutionalAbout ? (
        <div className={styles.prose}>{council.institutionalAbout}</div>
      ) : council.description ? (
        <p>{council.description}</p>
      ) : (
        <p className={styles.muted}>Conteúdo institucional em atualização.</p>
      )}

      {council.competencies && (
        <>
          <h3 className={styles.subsection_title}>Competências</h3>
          <div className={styles.prose}>{council.competencies}</div>
        </>
      )}

      {council.legalBasis && (
        <>
          <h3 className={styles.subsection_title}>Base legal</h3>
          <div className={styles.prose}>{council.legalBasis}</div>
        </>
      )}

      <h3 className={styles.subsection_title}>Contato</h3>
      <div className={styles.meta_list}>
        {council.address && <div><strong>Endereço:</strong> {council.address}</div>}
        {council.phone && <div><strong>Telefone:</strong> {council.phone}</div>}
        {council.email && <div><strong>E-mail:</strong> {council.email}</div>}
        {council.openingHours && <div><strong>Horário:</strong> {council.openingHours}</div>}
        {council.managerName && (
          <div><strong>{council.managerRole || 'Presidência'}:</strong> {council.managerName}</div>
        )}
      </div>
    </section>
  )
}
