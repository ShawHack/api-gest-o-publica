import { useState } from 'react'
import { createRuralOwner, resolveRuralProperty } from '../../../services/ruralPortalService'
import RuralNavbar from './RuralNavbar'
import styles from './RuralPortal.module.css'

const initialForm = { plusCode: '', cpf: '', codigoUpa: '', propertyName: '' }

function errorMessage(error) {
  return error?.response?.data?.message || error?.message || 'Não foi possível concluir o cadastro.'
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      // Em HTTP por IP, alguns navegadores expõem a API, mas recusam a cópia.
    }
  }

  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  const copied = typeof document.execCommand === 'function' && document.execCommand('copy')
  document.body.removeChild(field)
  return copied
}

export default function RuralOperatorPage() {
  const [form, setForm] = useState(initialForm)
  const [property, setProperty] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')

  const update = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))

  async function checkProperty() {
    if (!form.plusCode.includes('+')) return setError('Informe um Plus Code válido.')
    setLoading(true); setError(''); setProperty(null)
    try {
      const data = await resolveRuralProperty(form.plusCode)
      setProperty(data)
      if (data?.property) {
        setForm((current) => ({
          ...current,
          codigoUpa: data.property.codigoUpa || current.codigoUpa,
          propertyName: data.property.name || current.propertyName,
        }))
      }
    } catch (requestError) { setError(errorMessage(requestError)) }
    finally { setLoading(false) }
  }

  async function submit(event) {
    event.preventDefault(); setLoading(true); setError(''); setResult(null)
    try { setResult(await createRuralOwner(form)) }
    catch (requestError) { setError(errorMessage(requestError)) }
    finally { setLoading(false) }
  }

  async function copyCredential() {
    const text = `Usuário: ${result.account.username}\nSenha inicial (CPF): ${result.temporaryPassword}`
    try {
      const copied = await copyText(text)
      setCopyFeedback(copied ? 'Acesso copiado.' : 'Não foi possível copiar automaticamente. Selecione os dados acima e copie manualmente.')
    } catch (copyError) {
      setCopyFeedback('Não foi possível copiar automaticamente. Selecione os dados acima e copie manualmente.')
    }
  }

  return <div className={styles.appShell}>
    <RuralNavbar section="Área do operador" />
    <main className={styles.page}>
    <section className={styles.card}>
      <header className={styles.header}>
        <h1>Cadastro de proprietário rural</h1>
        <p>Uso exclusivo da Casa da Agricultura. Consulte o Plus Code antes de criar o acesso.</p>
      </header>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="plusCode">Plus Code *</label>
          <input id="plusCode" name="plusCode" value={form.plusCode} onChange={update} required autoComplete="off" />
        </div>
        <div className={styles.actions}>
          <button className={styles.buttonSecondary} type="button" onClick={checkProperty} disabled={loading}>Consultar UPA</button>
        </div>
        {property && <div className={property.found ? styles.success : styles.message}>
          {property.found
            ? `UPA localizada: ${property.property?.codigoUpa || 'sem código'}.`
            : property.catalogAvailable === false
              ? 'Catálogo temporariamente indisponível. Preencha os dados para cadastro manual; a UPA ficará pendente de revisão.'
              : 'Plus Code não cadastrado. Preencha os dados para registrar uma nova UPA.'}
        </div>}
        <div className={styles.grid}>
          <div className={styles.field}><label htmlFor="cpf">CPF do proprietário *</label><input id="cpf" name="cpf" value={form.cpf} onChange={update} inputMode="numeric" required /></div>
          <div className={styles.field}><label htmlFor="codigoUpa">Código da UPA {!property?.found && '*'}</label><input id="codigoUpa" name="codigoUpa" value={form.codigoUpa} onChange={update} required={!property?.found} /></div>
        </div>
        <div className={styles.field}><label htmlFor="propertyName">Nome da propriedade</label><input id="propertyName" name="propertyName" value={form.propertyName} onChange={update} /></div>
        <div className={styles.actions}><button className={styles.button} disabled={loading}>{loading ? 'Aguarde...' : 'Criar acesso'}</button></div>
      </form>
      {error && <div role="alert" className={styles.error}>{error}</div>}
      {result && <div className={styles.credential}>
        <strong>Acesso criado</strong>
        <code>Usuário: {result.account.username}</code>
        <code>Senha inicial (CPF): {result.temporaryPassword}</code>
        <p>Entregue ao proprietário com segurança. O CPF deverá ser substituído por uma nova senha no primeiro acesso.</p>
        <button className={styles.buttonSecondary} type="button" onClick={copyCredential}>Copiar acesso</button>
        {copyFeedback && <p role="status">{copyFeedback}</p>}
      </div>}
    </section>
    </main>
  </div>
}
