import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { IMaskInput } from 'react-imask'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../../utils/api'
import { AuthLayout } from './FormsGarcaLoginPage'
import styles from './FormsGarcaAuth.module.css'

const TERMS_URL = 'https://docs.google.com/document/d/1zhhrT0VLFMh_mUFs5ydWIfh2elEvRMUE3tkeaWzv0Rk/view'
const onlyDigits = (value = '') => value.replace(/\D/g, '')
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/
const initialUser = { name: '', cpf: '', phone: '', email: '', password: '', confirmpassword: '' }

export default function FormsGarcaRegisterPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(initialUser)
  const [errors, setErrors] = useState({})
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requestError, setRequestError] = useState('')
  const update = ({ target }) => { setUser((current) => ({ ...current, [target.name]: target.value })); setErrors((current) => ({ ...current, [target.name]: '' })) }
  const maskedUpdate = (name) => (value) => { setUser((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: '' })) }

  function validate() {
    const next = {}
    if (!user.name.trim()) next.name = 'Informe seu nome completo.'
    if (onlyDigits(user.cpf).length !== 11) next.cpf = 'Informe um CPF com 11 dígitos.'
    if (onlyDigits(user.phone).length < 10) next.phone = 'Informe um telefone válido.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(user.email)) next.email = 'Informe um e-mail válido.'
    if (!strongPassword.test(user.password)) next.password = 'Use 6 ou mais caracteres, com maiúscula, minúscula, número e símbolo.'
    if (user.confirmpassword !== user.password) next.confirmpassword = 'As senhas não coincidem.'
    if (!agreeTerms) next.agreeTerms = 'É necessário aceitar os Termos de Uso.'
    return next
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return }
    setLoading(true); setRequestError('')
    try {
      const { data } = await api.post('/users/register', { ...user, cpf: onlyDigits(user.cpf), phone: onlyDigits(user.phone), agreeTerms: true, acceptedTermsAt: new Date().toISOString(), acceptedTermsVersion: '2.0', acceptedTermsUrl: TERMS_URL })
      navigate('/formularios/login', { replace: true, state: { registrationMessage: data?.message || 'Cadastro realizado. Verifique seu e-mail para continuar.' } })
    } catch (error) {
      const field = error?.response?.data?.field
      const message = error?.response?.data?.message || 'Não foi possível concluir o cadastro. Tente novamente.'
      if (field) setErrors((current) => ({ ...current, [field]: message })); else setRequestError(message)
    } finally { setLoading(false) }
  }

  return <AuthLayout title="Sua participação começa aqui." subtitle="Crie uma conta para responder aos formulários digitais disponibilizados pelo município.">
    <header className={styles.cardHeader}><h2>Criar cadastro</h2><p>Preencha seus dados. Leva apenas alguns minutos.</p></header>
    <form className={styles.form} onSubmit={submit} noValidate>
      {requestError && <div className={`${styles.notice} ${styles.noticeError}`} role="alert">{requestError}</div>}
      <label className={styles.field}>Nome completo<input name="name" value={user.name} onChange={update} autoComplete="name" aria-invalid={!!errors.name} autoFocus />{errors.name && <span className={styles.error}>{errors.name}</span>}</label>
      <div className={styles.twoColumns}>
        <label className={styles.field}>CPF<IMaskInput name="cpf" mask="000.000.000-00" value={user.cpf} onAccept={maskedUpdate('cpf')} inputMode="numeric" placeholder="000.000.000-00" aria-invalid={!!errors.cpf} />{errors.cpf && <span className={styles.error}>{errors.cpf}</span>}</label>
        <label className={styles.field}>Telefone<IMaskInput name="phone" mask={[{ mask: '(00) 0000-0000' }, { mask: '(00) 00000-0000' }]} value={user.phone} onAccept={maskedUpdate('phone')} inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" aria-invalid={!!errors.phone} />{errors.phone && <span className={styles.error}>{errors.phone}</span>}</label>
      </div>
      <label className={styles.field}>E-mail<input name="email" type="email" value={user.email} onChange={update} autoComplete="email" placeholder="nome@exemplo.com" aria-invalid={!!errors.email} />{errors.email && <span className={styles.error}>{errors.email}</span>}</label>
      <div className={styles.twoColumns}>
        <label className={styles.field}>Senha<span className={styles.passwordWrap}><input name="password" type={showPassword ? 'text' : 'password'} value={user.password} onChange={update} autoComplete="new-password" aria-invalid={!!errors.password} /><button className={styles.eyeButton} type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span>{errors.password && <span className={styles.error}>{errors.password}</span>}</label>
        <label className={styles.field}>Confirmar senha<input name="confirmpassword" type={showPassword ? 'text' : 'password'} value={user.confirmpassword} onChange={update} autoComplete="new-password" aria-invalid={!!errors.confirmpassword} />{errors.confirmpassword && <span className={styles.error}>{errors.confirmpassword}</span>}</label>
      </div>
      <label className={styles.terms}><input type="checkbox" checked={agreeTerms} onChange={(event) => { setAgreeTerms(event.target.checked); setErrors((current) => ({ ...current, agreeTerms: '' })) }} /><span>Li e concordo com os <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">Termos de Uso</a>.{errors.agreeTerms && <span className={styles.error}> {errors.agreeTerms}</span>}</span></label>
      <button className={styles.submit} disabled={loading}>{loading ? 'Criando cadastro…' : 'Criar minha conta'}</button>
    </form>
    <p className={styles.switch}>Já possui cadastro? <Link to="/formularios/login">Entrar</Link></p>
    <div className={styles.security}><LockKeyhole size={14} /> Seus dados são protegidos e usados conforme os Termos de Uso.</div>
  </AuthLayout>
}
