import { useEffect, useMemo, useState } from 'react'
import {
  listAdminPartnerEntities,
  setPartnerEntityStatus,
} from '../../../../services/educationService'
import { ENTITY_TYPE_LABELS, mediaUrl } from '../educationUtils'
import { getUnitImagePath } from './entityUnitFormUtils'
import styles from './EducationAdminPortal.module.css'

export default function PartnerEntityAdminPanel({ showMsg }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await listAdminPartnerEntities({ limit: 500, q: searchQ.trim() || undefined })
      setItems(res.data?.data || [])
    } catch {
      showMsg('Erro ao carregar unidades.', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ])

  const partnerCount = useMemo(
    () => items.filter((item) => item.isPartnerEntity).length,
    [items]
  )

  async function handleToggle(entity, nextValue) {
    setTogglingId(entity._id)
    try {
      await setPartnerEntityStatus(entity._id, nextValue)
      setItems((prev) => prev.map((item) => (
        item._id === entity._id ? { ...item, isPartnerEntity: nextValue } : item
      )))
      showMsg(
        nextValue
          ? `"${entity.name}" marcada como entidade conveniada.`
          : `"${entity.name}" removida das entidades conveniadas.`
      )
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao atualizar.', false)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className={styles.panel}>
      <h3 style={{ marginTop: 0 }}>Entidades Conveniadas</h3>
      <p className={styles.muted}>
        Selecione as unidades já cadastradas que devem aparecer na página pública de Entidades Conveniadas.
        Os dados exibidos (foto, nome, endereço, contatos etc.) são reutilizados do cadastro em Unidades — não é necessário cadastrar novamente.
      </p>

      <div className={styles.formRow} style={{ marginBottom: '1rem' }}>
        <label className={`${styles.field} ${styles.formRowFull}`}>
          Buscar unidade
          <input
            type="search"
            placeholder="Nome da unidade..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </label>
      </div>

      <p className={styles.muted}>
        <strong>{partnerCount}</strong> de <strong>{items.length}</strong> unidade(s) marcada(s) como conveniada(s).
      </p>

      {loading ? (
        <p className={styles.muted}>Carregando unidades...</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Imagem</th>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Bairro</th>
                <th>Status</th>
                <th>Entidade conveniada</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.muted} style={{ textAlign: 'center', padding: '1.5rem' }}>
                    Nenhuma unidade encontrada. Cadastre unidades na aba Unidades.
                  </td>
                </tr>
              ) : items.map((item) => {
                const imagePath = getUnitImagePath(item)
                const imageSrc = imagePath ? mediaUrl(imagePath) : ''
                const disabled = !item.isActive || togglingId === item._id
                return (
                  <tr key={item._id}>
                    <td>
                      {imageSrc ? (
                        <img src={imageSrc} alt="" className={styles.tableThumb} />
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>{item.name}</td>
                    <td>{ENTITY_TYPE_LABELS[item.type] || item.type}</td>
                    <td>{item.neighborhood || '—'}</td>
                    <td>{item.isActive ? 'Ativa' : 'Inativa'}</td>
                    <td>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.6 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!item.isPartnerEntity}
                          disabled={disabled}
                          onChange={(e) => handleToggle(item, e.target.checked)}
                        />
                        {item.isPartnerEntity ? 'Sim' : 'Não'}
                      </label>
                      {!item.isActive && (
                        <div className={styles.muted} style={{ fontSize: '0.75rem' }}>
                          Unidade inativa
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
