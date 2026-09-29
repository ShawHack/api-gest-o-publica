import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Search, Calendar, MapPin, Building2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { getPublicVoucher } from '../../../services/formsGarcaService'
import styles from './PublicEventPage.module.css'

export default function PublicVoucherValidatePage() {
  const { voucherCode: paramCode } = useParams()
  const [code, setCode] = useState(paramCode || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleValidate = async (searchCode) => {
    const target = (searchCode || code || '').trim().toUpperCase()
    if (!target) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await getPublicVoucher(target)
      setResult(res)
    } catch (err) {
      setError(err.response?.data?.message || 'Código de comprovante não encontrado ou inválido.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (paramCode) {
      handleValidate(paramCode)
    }
  }, [paramCode])

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.voucherContainer}>
        <div style={{ marginBottom: '24px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#1e3a8a', textDecoration: 'none', fontWeight: 600 }}>
            <ArrowLeft size={18} /> Voltar ao Portal
          </Link>
        </div>

        <div className={styles.voucherHeader}>
          <h2>Validação de Inscrição Oficial</h2>
          <p>Consulte a autenticidade e validade de vouchers de eventos municipais.</p>
        </div>

        {/* BUSCA DE VOUCHER */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <input
            type="text"
            className={styles.formInput}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Digite o código (ex: RU7L16K2)"
            style={{ fontSize: '1.1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}
          />
          <button
            type="button"
            className={styles.btnPrint}
            onClick={() => handleValidate(code)}
            disabled={loading}
          >
            <Search size={18} /> {loading ? 'Buscando...' : 'Verificar'}
          </button>
        </div>

        {error && (
          <div className={styles.errorAlert}>
            <XCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className={styles.voucherCard}>
            <div
              className={styles.voucherCardHeader}
              style={{
                backgroundColor: result.status === 'confirmada' ? '#15803d' : result.status === 'pendente' ? '#b45309' : '#b91c1c',
              }}
            >
              <div>
                <span className={styles.badgeGov}>Prefeitura Municipal de Garça</span>
                <h3>{result.event?.titulo || 'Evento Municipal'}</h3>
              </div>
              <div className={styles.voucherCodeBox}>
                <span className={styles.voucherCodeLabel}>VOUCHER</span>
                <strong className={styles.voucherCodeText}>{result.voucherCode}</strong>
              </div>
            </div>

            <div className={styles.voucherDetailsGrid}>
              <div>
                <span className={styles.detailLabel}>Situação:</span>
                <strong style={{ textTransform: 'uppercase', color: result.status === 'confirmada' ? '#15803d' : '#b91c1c' }}>
                  {result.status === 'confirmada' ? '✓ Inscrição Válida e Confirmada' : result.status}
                </strong>
              </div>
              <div>
                <span className={styles.detailLabel}>Participante:</span>
                <strong>{result.userName}</strong>
              </div>
              <div>
                <span className={styles.detailLabel}>Data da Inscrição:</span>
                <strong>{new Date(result.createdAt).toLocaleString('pt-BR')}</strong>
              </div>
              <div>
                <span className={styles.detailLabel}>Local do Evento:</span>
                <strong>{result.event?.local || 'Garça / SP'}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
