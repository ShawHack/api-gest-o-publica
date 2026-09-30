import React from 'react'
import {
  Calendar,
  MapPin,
  Users,
  Eye,
  Building2
} from 'lucide-react'
import styles from './FormsEventLivePreview.module.css'

function formatDate(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    if (Number.isNaN(d.getTime())) return isoStr
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  } catch {
    return isoStr
  }
}

export default function FormsEventLivePreview({ form = {} }) {
  const accentColor = form.corPrimaria || '#1e3a8a'
  const ocupadas = form.vagasOcupadas || 0
  const limite = form.limiteInscricoes ? Number(form.limiteInscricoes) : null
  const fields = Array.isArray(form.campos) ? form.campos : []

  return (
    <div
      className={styles.previewContainer}
      style={{ '--preview-accent': accentColor }}
      aria-label="Prévia em tempo real do formulário público"
    >
      {/* 1. Aviso de Somente Leitura */}
      <div className={styles.readonlyNotice}>
        <Eye size={14} aria-hidden="true" />
        <span>Pré-visualização em tempo real · Somente leitura</span>
      </div>

      {/* 2. Banner do Evento */}
      <div className={styles.bannerWrapper}>
        {form.bannerUrl ? (
          <img
            src={form.bannerUrl}
            alt="Banner do evento"
            className={styles.bannerImg}
          />
        ) : (
          <div className={styles.bannerPlaceholder}>
            <Building2 size={32} className={styles.placeholderIcon} />
            <span>Prefeitura Municipal de Garça</span>
          </div>
        )}

        {/* Logotipo Sobreposto */}
        {form.logoUrl && (
          <div className={styles.logoBadge}>
            <img src={form.logoUrl} alt="Logotipo do evento" className={styles.logoImg} />
          </div>
        )}
      </div>

      {/* 3. Identificação e Título */}
      <div className={styles.body}>
        <div className={styles.headerBlock}>
          {form.organizadorNome && (
            <span className={styles.organizer}>{form.organizadorNome}</span>
          )}
          <h3 className={styles.title}>{form.titulo || 'Título do Evento'}</h3>
          {form.subtitulo && <p className={styles.subtitle}>{form.subtitulo}</p>}
        </div>

        {/* 4. Cartões de Metadados */}
        <div className={styles.metaCards}>
          <div className={styles.metaCard}>
            <Calendar size={14} className={styles.metaIcon} aria-hidden="true" />
            <div>
              <span className={styles.metaLabel}>Data do Evento</span>
              <strong className={styles.metaValue}>
                {formatDate(form.dataEvento) || 'A definir'}
                {form.dataFim && ` até ${formatDate(form.dataFim)}`}
              </strong>
            </div>
          </div>

          {form.local && (
            <div className={styles.metaCard}>
              <MapPin size={14} className={styles.metaIcon} aria-hidden="true" />
              <div>
                <span className={styles.metaLabel}>Local</span>
                <strong className={styles.metaValue}>{form.local}</strong>
                {form.endereco && <small className={styles.metaSub}>{form.endereco}</small>}
              </div>
            </div>
          )}

          <div className={styles.metaCard}>
            <Users size={14} className={styles.metaIcon} aria-hidden="true" />
            <div>
              <span className={styles.metaLabel}>Vagas</span>
              <strong className={styles.metaValue}>
                {limite ? `${ocupadas} / ${limite} vagas` : 'Vagas ilimitadas'}
              </strong>
            </div>
          </div>
        </div>

        {/* 5. Descrição / Sobre */}
        {form.descricao && (
          <div className={styles.infoBox}>
            <h4 className={styles.infoTitle}>Sobre o Evento</h4>
            <p className={styles.infoText}>{form.descricao}</p>
          </div>
        )}

        {/* 6. Orientações */}
        {form.orientacoesInscricao && (
          <div className={styles.infoBox} style={{ borderLeftColor: '#f59e0b' }}>
            <h4 className={styles.infoTitle}>Orientações ao Participante</h4>
            <p className={styles.infoText}>{form.orientacoesInscricao}</p>
          </div>
        )}

        {/* 7. Formulário Simulado */}
        <div className={styles.formSection}>
          <h4 className={styles.formSectionTitle}>Formulário de Inscrição</h4>

          {/* Dados Padrão do Cidadão */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Nome Completo <span className={styles.req}>*</span>
            </label>
            <input
              type="text"
              className={styles.simInput}
              disabled
              placeholder="Nome do munícipe"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                E-mail <span className={styles.req}>*</span>
              </label>
              <input
                type="text"
                className={styles.simInput}
                disabled
                placeholder="exemplo@email.com"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                CPF <span className={styles.req}>*</span>
              </label>
              <input
                type="text"
                className={styles.simInput}
                disabled
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          {/* Campos Personalizados Dinâmicos */}
          {fields.map((campo, idx) => (
            <div key={campo.id || idx} className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                {campo.label || `Campo personalizado ${idx + 1}`}
                {campo.required && <span className={styles.req}> *</span>}
              </label>

              {campo.type === 'textarea' ? (
                <textarea
                  className={styles.simInput}
                  disabled
                  rows={2}
                  placeholder={campo.placeholder || 'Resposta em texto longo'}
                />
              ) : campo.type === 'select' ? (
                <select className={styles.simInput} disabled>
                  <option value="">Selecione uma opção...</option>
                  {(campo.options || []).map((opt, oIdx) => (
                    <option key={oIdx} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : ['radio', 'checkbox'].includes(campo.type) ? (
                <div className={styles.choiceGroup}>
                  {(campo.options && campo.options.length > 0
                    ? campo.options
                    : ['Opção A', 'Opção B']
                  ).map((opt, oIdx) => (
                    <label key={oIdx} className={styles.choiceItem}>
                      <input type={campo.type} disabled />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  type={campo.type || 'text'}
                  className={styles.simInput}
                  disabled
                  placeholder={campo.placeholder || 'Sua resposta'}
                />
              )}

              {campo.helpText && (
                <small className={styles.fieldHelp}>{campo.helpText}</small>
              )}
            </div>
          ))}

          {/* Botão de Envio Simulado */}
          <button
            type="button"
            className={styles.submitBtn}
            disabled
            style={{ backgroundColor: accentColor }}
          >
            Confirmar Inscrição (Simulação)
          </button>
        </div>
      </div>
    </div>
  )
}
