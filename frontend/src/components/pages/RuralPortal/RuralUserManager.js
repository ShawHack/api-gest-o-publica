import { useCallback, useEffect, useState } from 'react'
import { createRuralUser, listRuralUsers, updateRuralUserRole } from '../../../services/ruralPortalService'
import styles from './RuralPortal.module.css'

const initialForm = { name: '', email: '', phone: '', cpf: '', password: '', role: 'rotas_operador' }
const messageOf = (error) => error?.response?.data?.message || 'Não foi possível concluir a operação.'

export default function RuralUserManager() {
  const [form, setForm] = useState(initialForm)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setItems((await listRuralUsers()).items || []) }
    catch (requestError) { setError(messageOf(requestError)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  const update = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))

  async function submit(event) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('')
    try {
      await createRuralUser(form)
      setForm(initialForm); setMessage('Usuário criado com sucesso.'); await load()
    } catch (requestError) { setError(messageOf(requestError)); setLoading(false) }
  }

  async function setRole(id, role) {
    setLoading(true); setError(''); setMessage('')
    try { const result = await updateRuralUserRole(id, role); setMessage(result.message); await load() }
    catch (requestError) { setError(messageOf(requestError)); setLoading(false) }
  }

  return <section>
    <header className={styles.header}><h2>Usuários de Estradas Rurais</h2><p>Crie acessos internos sem utilizar as telas do Memorial.</p></header>
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.gridTwo}>
        <Field label="Nome completo *" name="name" value={form.name} onChange={update} required />
        <Field label="E-mail *" name="email" type="email" value={form.email} onChange={update} required />
        <Field label="Telefone *" name="phone" value={form.phone} onChange={update} required />
        <Field label="CPF *" name="cpf" value={form.cpf} onChange={update} required />
        <Field label="Senha inicial *" name="password" type="password" value={form.password} onChange={update} required />
        <label className={styles.field}>Perfil *<select name="role" value={form.role} onChange={update}><option value="rotas_operador">Operador</option><option value="rotas_admin">Administrador do módulo</option></select></label>
      </div>
      <small>A senha deve conter letra maiúscula, minúscula, número e caractere especial.</small>
      <div className={styles.actions}><button className={styles.button} disabled={loading}>Criar usuário</button></div>
    </form>
    {error && <div role="alert" className={styles.error}>{error}</div>}{message && <div role="status" className={styles.success}>{message}</div>}
    <h3>Usuários cadastrados</h3>
    {loading && <p>Carregando…</p>}
    <div className={styles.propertyList}>{items.map((user) => <article className={styles.propertyItem} key={user._id}>
      <div><strong>{user.name}</strong><span>{user.email}</span><small>{user.role === 'rotas_admin' ? 'Administrador do módulo' : user.role === 'rotas_operador' ? 'Operador' : 'Aguardando liberação'}</small></div>
      <div className={styles.actions}>
        {user.role !== 'rotas_operador' && <button className={styles.buttonSecondary} type="button" onClick={() => setRole(user._id, 'rotas_operador')}>Liberar operador</button>}
        {user.role !== 'rotas_admin' && <button className={styles.buttonSecondary} type="button" onClick={() => setRole(user._id, 'rotas_admin')}>Tornar administrador</button>}
        {user.role !== 'usuario' && <button className={styles.buttonDanger} type="button" onClick={() => setRole(user._id, 'usuario')}>Revogar acesso</button>}
      </div>
    </article>)}</div>
  </section>
}

function Field({ label, ...props }) { return <label className={styles.field}>{label}<input {...props} /></label> }
