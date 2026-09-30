import React from 'react'
import {
  Calendar,
  Users,
  AlertCircle,
  AlertTriangle,
  Palette,
  FileText
} from 'lucide-react'
import FormsStatusBadge from './FormsStatusBadge'
import styles from './FormsEventSummary.module.css'

function formatDate(isoStr) {
  if (!isoStr) return 'Não definida'
  try {
    const d = new Date(isoStr)
    if (Number.isNaN(d.getTime())) return 'Não definida'
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  } catch {
    return isoStr
  }
}

export default function FormsEventSummary({ form = {} }) {
  const ocupadas = form.vagasOcupadas || 0
  const limite = form.limiteInscricoes ? Number(form.limiteInscricoes) : null
  const fieldsCount = Array.isArray(form.campos) ? form.campos.length : 0
  const requiredFieldsCount = Array.isArray(form.campos)
    ? form.campos.filter((f) => f.required).length
    : 0

  // Alertas de integridade
  const missingTitle = !form.titulo || !form.titulo.trim()
  const missingDate = !form.dataEvento
  const missingFields = fieldsCount === 0

  return (
    <div className={styles.summaryContainer}>
      {/* 1. Alertas de Integridade */}
      {(missingTitle || missingDate) && (
        <div className={styles.alertBox} role="alert">
          <AlertCircle size={16} className={styles.alertIcon} />
          <div className={styles.alertText}>
            <strong>Campos obrigatórios pendentes:</strong>
            <ul>
              {missingTitle && <li>Título do evento</li>}
              {missingDate && <li>Data principal do evento</li>}
            </ul>
          </div>
        </div>
      )}

      {missingFields && (
        <div className={styles.warningBox}>
          <AlertTriangle size={15} className={styles.warningIcon} />
          <span>Nenhum campo personalizado adicionado (coletará apenas dados básicos).</span>
        </div>
      )}

      {/* 2. Informações Gerais do Evento */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <FileText size={15} />
          <h4>Identificação</h4>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Título:</span>
          <span className={styles.value} title={form.titulo}>
            {form.titulo || 'Sem título'}
          </span>
        </div>
        {form.subtitulo && (
          <div className={styles.infoRow}>
            <span className={styles.label}>Subtítulo:</span>
            <span className={styles.value} title={form.subtitulo}>
              {form.subtitulo}
            </span>
          </div>
        )}
        <div className={styles.infoRow}>
          <span className={styles.label}>Status:</span>
          <FormsStatusBadge status={form.status || 'rascunho'} size="sm" />
        </div>
        {form.tipoEvento && (
          <div className={styles.infoRow}>
            <span className={styles.label}>Modalidade:</span>
            <span className={styles.value} style={{ textTransform: 'capitalize' }}>
              {form.tipoEvento}
            </span>
          </div>
        )}
      </div>

      {/* 3. Período e Localização */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Calendar size={15} />
          <h4>Datas e Local</h4>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Início do Evento:</span>
          <span className={styles.value}>{formatDate(form.dataEvento)}</span>
        </div>
        {form.dataFim && (
          <div className={styles.infoRow}>
            <span className={styles.label}>Fim do Evento:</span>
            <span className={styles.value}>{formatDate(form.dataFim)}</span>
          </div>
        )}
        {form.local && (
          <div className={styles.infoRow}>
            <span className={styles.label}>Local:</span>
            <span className={styles.value} title={form.local}>
              {form.local}
            </span>
          </div>
        )}
      </div>

      {/* 4. Inscrições & Capacidade */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Users size={15} />
          <h4>Inscrições e Vagas</h4>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Inscrições:</span>
          <span className={form.inscricoesAbertas ? styles.badgeSuccess : styles.badgeMuted}>
            {form.inscricoesAbertas ? 'Abertas' : 'Fechadas'}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Capacidade:</span>
          <span className={styles.value}>
            {limite ? `${ocupadas} / ${limite} vagas` : 'Vagas Ilimitadas'}
          </span>
        </div>
        {form.inicioInscricoes && (
          <div className={styles.infoRow}>
            <span className={styles.label}>Abertura:</span>
            <span className={styles.value}>{formatDate(form.inicioInscricoes)}</span>
          </div>
        )}
        {form.fimInscricoes && (
          <div className={styles.infoRow}>
            <span className={styles.label}>Encerramento:</span>
            <span className={styles.value}>{formatDate(form.fimInscricoes)}</span>
          </div>
        )}
      </div>

      {/* 5. Formulário e Identidade */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Palette size={15} />
          <h4>Formulário e Estilo</h4>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Campos Personalizados:</span>
          <span className={styles.value}>
            {fieldsCount} ({requiredFieldsCount} obrigatórios)
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Cor Primária:</span>
          <div className={styles.colorIndicator}>
            <span
              className={styles.colorSwatch}
              style={{ backgroundColor: form.corPrimaria || '#1e3a8a' }}
            />
            <span className={styles.value}>{form.corPrimaria || '#1e3a8a'}</span>
          </div>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Logotipo:</span>
          <span className={form.logoUrl ? styles.badgeSuccess : styles.badgeMuted}>
            {form.logoUrl ? 'Definido' : 'Pendente'}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Banner:</span>
          <span className={form.bannerUrl ? styles.badgeSuccess : styles.badgeMuted}>
            {form.bannerUrl ? 'Definido' : 'Pendente'}
          </span>
        </div>
      </div>
    </div>
  )
}
