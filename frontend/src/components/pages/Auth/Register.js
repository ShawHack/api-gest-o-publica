import { useState, useContext } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Input from '../../form/input'
import styles from '../../form/Form.module.css'
import { Link } from 'react-router-dom'
import { IMaskInput } from 'react-imask'
import { Context } from '../../../context/UserContext'

const onlyDigits = (v = '') => v.replace(/\D/g, '')
const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
// mesma regra do backend: 6+ com maiúscula, minúscula, número e especial
const strongPass = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/

// URL oficial dos Termos de Uso (Google Docs — modo leitura)
const TERMS_URL =
  'https://docs.google.com/document/d/1zhhrT0VLFMh_mUFs5ydWIfh2elEvRMUE3tkeaWzv0Rk/view'

function Register() {
  const [user, setUser] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    password: '',
    confirmpassword: '',
  })
  const [errors, setErrors] = useState({})
  const [agreeTerms, setAgreeTerms] = useState(false)
  const { register } = useContext(Context)

  // 👁️ mostrar/ocultar senha
  const [showPass, setShowPass] = useState({ password: false, confirm: false })

  const clearFieldError = (field) =>
    setErrors((prev) => {
      if (!prev[field]) return prev
      const { [field]: _, ...rest } = prev
      return rest
    })

  function handleOnChange(e) {
    const { name, value } = e.target
    setUser((prev) => ({ ...prev, [name]: value }))
    clearFieldError(name)
  }

  const handleMaskedChange = (field) => (val) => {
    setUser((prev) => ({ ...prev, [field]: val }))
    clearFieldError(field)
  }

  function validate(values) {
    const e = {}

    if (!values.name?.trim()) e.name = 'O nome é obrigatório'

    const cpfDigits = onlyDigits(values.cpf)
    if (cpfDigits.length !== 11) e.cpf = 'CPF inválido (11 dígitos)'

    if (!values.email?.trim() || !isEmail(values.email)) e.email = 'E-mail inválido'

    const phoneDigits = onlyDigits(values.phone)
    if (!phoneDigits) {
      e.phone = 'O telefone é obrigatório'
    } else if (phoneDigits.length < 10) {
      e.phone = 'Telefone inválido (mín. 10 dígitos)'
    }

    if (!values.password || !strongPass.test(values.password)) {
      e.password =
        'A senha deve ter no mínimo 6 caracteres, incluindo maiúscula, minúscula, número e caractere especial'
    }

    if (values.confirmpassword !== values.password)
      e.confirmpassword = 'As senhas não coincidem'

    if (!agreeTerms) e.agreeTerms = 'Você precisa aceitar os Termos de Uso para continuar'

    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const currentErrors = validate(user)
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors)
      return
    }

    setErrors({})
    const payload = {
      ...user,
      cpf: onlyDigits(user.cpf),
      phone: onlyDigits(user.phone),
      // aceite persistido pelo backend
      agreeTerms: true,
      acceptedTermsAt: new Date().toISOString(),
      acceptedTermsVersion: '2.0',
      acceptedTermsUrl: TERMS_URL,
    }

    register(payload).catch((err) => {
      const msg = err?.response?.data?.message
      const field = err?.response?.data?.field
      if (field) setErrors({ [field]: msg || 'Verifique este campo' })
    })
  }

  return (
    <section className={styles.form_container}>
      <h2>Cadastro de Usuário</h2>

      <form onSubmit={handleSubmit} noValidate>
        {/* Nome */}
        <div className={styles.form_control}>
          <Input
            id="name"
            text="Nome"
            type="text"
            name="name"
            placeholder="Digite o seu nome"
            value={user.name}
            onChange={handleOnChange}
            autoComplete="name"
            className={errors.name ? styles.inputError : ''}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'err-name' : undefined}
          />
          {errors.name && (
            <span id="err-name" className={styles.errorMessage}>
              {errors.name}
            </span>
          )}
        </div>

        {/* CPF */}
        <div className={styles.form_control}>
          <label htmlFor="cpf">CPF</label>
          <IMaskInput
            id="cpf"
            name="cpf"
            mask="000.000.000-00"
            value={user.cpf || ''}
            onAccept={handleMaskedChange('cpf')}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Digite o seu CPF"
            className={`${styles.input} ${errors.cpf ? styles.inputError : ''}`}
            aria-invalid={!!errors.cpf}
            aria-describedby={errors.cpf ? 'err-cpf' : undefined}
          />
          {errors.cpf && (
            <span id="err-cpf" className={styles.errorMessage}>
              {errors.cpf}
            </span>
          )}
        </div>

        {/* Telefone */}
        <div className={styles.form_control}>
          <label htmlFor="phone">Telefone</label>
          <IMaskInput
            id="phone"
            name="phone"
            mask={[
              { mask: '(00) 0000-0000' },
              { mask: '(00) 00000-0000' },
            ]}
            dispatch={(appended, masked) => {
              const digits = (masked.value + appended).replace(/\D/g, '')
              return digits.length > 10 ? masked.compiledMasks[1] : masked.compiledMasks[0]
            }}
            value={user.phone || ''}
            onAccept={handleMaskedChange('phone')}
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Digite o seu telefone"
            className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'err-phone' : undefined}
          />
          {errors.phone && (
            <span id="err-phone" className={styles.errorMessage}>
              {errors.phone}
            </span>
          )}
        </div>

        {/* E-mail */}
        <div className={styles.form_control}>
          <Input
            id="email"
            text="E-mail"
            type="email"
            name="email"
            placeholder="Digite o seu e-mail"
            value={user.email}
            onChange={handleOnChange}
            autoComplete="email"
            className={errors.email ? styles.inputError : ''}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'err-email' : undefined}
          />
          {errors.email && (
            <span id="err-email" className={styles.errorMessage}>
              {errors.email}
            </span>
          )}
        </div>

        {/* Senha (com olhinho) */}
        <div className={styles.form_control}>
          <label htmlFor="password">Senha</label>

          <div className={styles.password_wrap}>
            <input
              id="password"
              name="password"
              type={showPass.password ? 'text' : 'password'}
              value={user.password}
              onChange={handleOnChange}
              autoComplete="new-password"
              className={`${styles.input} ${errors.password ? styles.inputError : ''} ${styles.password_input}`}
              placeholder="Digite sua senha"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'err-password' : undefined}
            />
            <button
              type="button"
              className={styles.toggle_eye}
              aria-label={showPass.password ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setShowPass((s) => ({ ...s, password: !s.password }))}
            >
              {showPass.password ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {errors.password && (
            <span id="err-password" className={styles.errorMessage}>
              {errors.password}
            </span>
          )}
        </div>

        {/* Confirmação de Senha (com olhinho) */}
        <div className={styles.form_control}>
          <label htmlFor="confirmpassword">Confirmação de Senha</label>

          <div className={styles.password_wrap}>
            <input
              id="confirmpassword"
              name="confirmpassword"
              type={showPass.confirm ? 'text' : 'password'}
              value={user.confirmpassword}
              onChange={handleOnChange}
              autoComplete="new-password"
              className={`${styles.input} ${errors.confirmpassword ? styles.inputError : ''} ${styles.password_input}`}
              placeholder="Confirme sua senha"
              aria-invalid={!!errors.confirmpassword}
              aria-describedby={errors.confirmpassword ? 'err-confirmpassword' : undefined}
            />
            <button
              type="button"
              className={styles.toggle_eye}
              aria-label={showPass.confirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
              onClick={() => setShowPass((s) => ({ ...s, confirm: !s.confirm }))}
            >
              {showPass.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {errors.confirmpassword && (
            <span id="err-confirmpassword" className={styles.errorMessage}>
              {errors.confirmpassword}
            </span>
          )}
        </div>

        {/* Termos de Uso: link externo + checkbox */}
        <div className={`${styles.form_control} ${styles.full_row} ${styles.centered_narrow}`}>
          <div className={styles.centered_narrow} style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <a
              id="terms-link"
              href={TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkButton ?? styles.link}
              aria-label="Abrir Termos de Uso em nova aba"
            >
              <strong>Ver Termos de Uso</strong>
            </a>
          </div>

          <div className={styles.form_control}>
            <div>
              <input
                id="agreeTerms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked)
                  clearFieldError('agreeTerms')
                }}
                aria-describedby={errors.agreeTerms ? 'err-agreeTerms' : undefined}
              />
              <label htmlFor="agreeTerms"> Li e concordo com os Termos de Uso.</label>
            </div>

            {errors.agreeTerms && (
              <span id="err-agreeTerms" className={styles.errorMessage}>
                {errors.agreeTerms}
              </span>
            )}
          </div>
        </div>

        <input type="submit" value="Cadastrar" />
      </form>

      <p>
        Já tem conta? <Link to="/login">Clique aqui</Link>
      </p>
    </section>
  )
}

export default Register
