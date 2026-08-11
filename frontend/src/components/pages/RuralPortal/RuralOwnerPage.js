import { useEffect, useState } from 'react'
import { changeRuralPassword, getRuralProfile, ruralLogin, saveRuralProfile } from '../../../services/ruralPortalService'
import RuralNavbar from './RuralNavbar'
import styles from './RuralPortal.module.css'

const TOKEN_KEY = 'rural_portal_token'
const emptyProfile = { fullName: '', phone: '', whatsapp: '', email: '', mailingAddress: '', propertyName: '', ruralNeighborhood: '', totalAreaHectares: '', relationship: 'owner', activities: '', residents: '', accessNotes: '', notes: '' }
const messageOf = (error) => error?.response?.data?.message || error?.message || 'Não foi possível concluir a operação.'

export default function RuralOwnerPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '')
  const [login, setLogin] = useState({ username: '', password: '' })
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [profile, setProfile] = useState(emptyProfile)
  const [status, setStatus] = useState('draft')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (token) loadProfile(token)
    // A sessão é restaurada somente na montagem; mudanças posteriores já carregam explicitamente o perfil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run(action) {
    setLoading(true); setError(''); setMessage('')
    try { await action() } catch (requestError) { setError(messageOf(requestError)) }
    finally { setLoading(false) }
  }

  async function loadProfile(currentToken) {
    await run(async () => {
      const data = await getRuralProfile(currentToken)
      setMustChangePassword(Boolean(data.account?.mustChangePassword))
      setStatus(data.profile?.status || 'draft')
      const personal = data.profile?.personal || {}
      const ruralProperty = data.profile?.property || {}
      setProfile({
        ...emptyProfile, ...personal,
        propertyName: ruralProperty.name || data.property?.name || '',
        ruralNeighborhood: ruralProperty.ruralNeighborhood || '',
        totalAreaHectares: ruralProperty.totalAreaHectares ?? '',
        relationship: ruralProperty.relationship || 'owner',
        activities: (ruralProperty.activities || []).join(', '),
        residents: ruralProperty.residents ?? '', accessNotes: ruralProperty.accessNotes || '', notes: ruralProperty.notes || '',
      })
    })
  }

  async function submitLogin(event) {
    event.preventDefault()
    await run(async () => {
      const data = await ruralLogin(login.username, login.password)
      sessionStorage.setItem(TOKEN_KEY, data.token); setToken(data.token)
      setMustChangePassword(Boolean(data.account?.mustChangePassword))
      if (!data.account?.mustChangePassword) await loadProfile(data.token)
    })
  }

  async function submitPassword(event) {
    event.preventDefault()
    if (newPassword.length < 10) return setError('A nova senha deve ter pelo menos 10 caracteres.')
    await run(async () => { await changeRuralPassword(token, newPassword); setMustChangePassword(false); setMessage('Senha alterada. Complete seu cadastro.') })
  }

  async function submitProfile(event, submit) {
    event.preventDefault()
    await run(async () => {
      const saved = await saveRuralProfile(token, {
        personal: { fullName: profile.fullName, phone: profile.phone, whatsapp: profile.whatsapp, email: profile.email, mailingAddress: profile.mailingAddress },
        property: { name: profile.propertyName, ruralNeighborhood: profile.ruralNeighborhood, totalAreaHectares: profile.totalAreaHectares === '' ? null : Number(profile.totalAreaHectares), relationship: profile.relationship, activities: profile.activities.split(',').map((item) => item.trim()).filter(Boolean), residents: profile.residents === '' ? null : Number(profile.residents), accessNotes: profile.accessNotes, notes: profile.notes },
        submit,
      })
      setStatus(saved.status); setMessage(submit ? 'Cadastro enviado para análise.' : 'Rascunho salvo.')
    })
  }

  const updateProfile = ({ target }) => setProfile((current) => ({ ...current, [target.name]: target.value }))

  if (!token) return <Shell title="Portal do Produtor Rural" subtitle="Use o Plus Code e a senha fornecida pela Casa da Agricultura." error={error} message={message}>
    <form className={styles.form} onSubmit={submitLogin}>
      <Field label="Plus Code" name="username" value={login.username} onChange={({ target }) => setLogin((current) => ({ ...current, username: target.value }))} required />
      <Field label="Senha" name="password" type="password" value={login.password} onChange={({ target }) => setLogin((current) => ({ ...current, password: target.value }))} required />
      <button className={styles.button} disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
    </form>
  </Shell>

  if (mustChangePassword) return <Shell title="Crie sua senha" subtitle="Substitua a senha temporária antes de preencher o cadastro." error={error} message={message}>
    <form className={styles.form} onSubmit={submitPassword}>
      <Field label="Nova senha" name="newPassword" type="password" value={newPassword} onChange={({ target }) => setNewPassword(target.value)} required />
      <button className={styles.button} disabled={loading}>Salvar nova senha</button>
    </form>
  </Shell>

  return <Shell title="Cadastro rural" subtitle="Preencha seus dados e os dados da propriedade." error={error} message={message}>
    <span className={styles.status}>Situação: {status}</span>
    <form className={styles.form} onSubmit={(event) => submitProfile(event, false)}>
      <section className={styles.section}><h2>Dados pessoais</h2><div className={styles.grid}>
        <Field label="Nome completo *" name="fullName" value={profile.fullName} onChange={updateProfile} required />
        <Field label="Telefone *" name="phone" value={profile.phone} onChange={updateProfile} required />
        <Field label="WhatsApp" name="whatsapp" value={profile.whatsapp} onChange={updateProfile} />
        <Field label="E-mail" name="email" type="email" value={profile.email} onChange={updateProfile} />
      </div><Field label="Endereço para correspondência" name="mailingAddress" value={profile.mailingAddress} onChange={updateProfile} /></section>
      <section className={styles.section}><h2>Dados da propriedade</h2><div className={styles.grid}>
        <Field label="Nome da propriedade" name="propertyName" value={profile.propertyName} onChange={updateProfile} />
        <Field label="Bairro rural" name="ruralNeighborhood" value={profile.ruralNeighborhood} onChange={updateProfile} />
        <Field label="Área total (hectares)" name="totalAreaHectares" type="number" step="0.01" value={profile.totalAreaHectares} onChange={updateProfile} />
        <label className={styles.field}>Relação com a propriedade<select name="relationship" value={profile.relationship} onChange={updateProfile}><option value="owner">Proprietário</option><option value="tenant">Arrendatário</option><option value="partner">Parceiro</option><option value="possessor">Possuidor</option><option value="other">Outro</option></select></label>
        <Field label="Moradores" name="residents" type="number" value={profile.residents} onChange={updateProfile} />
      </div><Field label="Atividades (separadas por vírgula)" name="activities" value={profile.activities} onChange={updateProfile} /><Field label="Condições de acesso" name="accessNotes" textarea value={profile.accessNotes} onChange={updateProfile} /><Field label="Observações" name="notes" textarea value={profile.notes} onChange={updateProfile} /></section>
      <div className={styles.actions}><button className={styles.buttonSecondary} disabled={loading}>Salvar rascunho</button><button type="button" className={styles.button} disabled={loading} onClick={(event) => submitProfile(event, true)}>Enviar para análise</button></div>
    </form>
  </Shell>
}

function Shell({ title, subtitle, error, message, children }) { return <div className={styles.appShell}><RuralNavbar section="Portal do produtor" /><main className={styles.page}><section className={styles.card}><header className={styles.header}><h1>{title}</h1><p>{subtitle}</p></header>{children}{error && <div role="alert" className={styles.error}>{error}</div>}{message && <div className={styles.success}>{message}</div>}</section></main></div> }
function Field({ label, textarea, ...props }) { return <label className={styles.field}>{label}{textarea ? <textarea {...props} /> : <input {...props} />}</label> }
