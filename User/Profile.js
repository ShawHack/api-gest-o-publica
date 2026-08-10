import api from '../../../utils/api'
import { useState, useEffect } from 'react'
import styles from './Profile.module.css'
import formStyles from '../../form/Form.module.css'
import Input from '../../form/input'
import useFlashMessage from '../../../hooks/useFlashMessage'

function Profile() {
  const [user, setUser] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const { setFlashMessage } = useFlashMessage()

  // Função para ler o token (compatível com diferentes formatos)
  const readToken = () => {
    const fromAuth = JSON.parse(localStorage.getItem('auth') || '{}')?.token
    if (fromAuth) return fromAuth
    const raw = localStorage.getItem('token')
    if (!raw) return ''
    try { 
      return JSON.parse(raw) 
    } catch { 
      return raw.replace(/^"+|"+$/g, '') 
    }
  }

  const token = readToken()

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setFlashMessage('Você precisa estar logado para acessar o perfil.', 'error')
      return
    }

    setLoading(true)
    console.log('[Profile] Buscando dados do usuário...', { token: token ? 'presente' : 'ausente' })
    
    // Envia o token explicitamente para garantir que está correto
    // O interceptor também pode adicionar, mas vamos garantir
    api
      .get('/users/checkuser', { 
        headers: { 
          Authorization: `Bearer ${token}` 
        } 
      })
      .then((response) => {
        console.log('[Profile] Resposta completa da API:', response.data)
        
        // A API retorna: { ok: true, user: currentUser, id, name, email, role }
        // O objeto user contém todos os dados do usuário incluindo _id
        const userData = response.data?.user || response.data
        
        if (userData && (userData._id || userData.id)) {
          // Garante que _id existe mesmo se vier como id
          if (userData.id && !userData._id) {
            userData._id = userData.id
          }
          console.log('[Profile] Dados do usuário carregados:', { _id: userData._id, name: userData.name })
          setUser(userData)
        } else {
          console.error('[Profile] Resposta da API não contém dados válidos do usuário:', response.data)
          setFlashMessage('Erro ao carregar dados do usuário. Resposta inválida da API.', 'error')
          setUser(null)
        }
      })
      .catch((err) => {
        console.error('[Profile] Erro ao buscar dados do usuário:', err)
        console.error('[Profile] Detalhes do erro:', {
          status: err?.response?.status,
          data: err?.response?.data,
          message: err?.message
        })
        const errorMsg = err?.response?.data?.message || err?.message || 'Erro ao carregar dados do usuário.'
        setFlashMessage(errorMsg, 'error')
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
        console.log('[Profile] Carregamento finalizado')
      })
  }, [token, setFlashMessage])

  function onFileChange(e) {
    const file = e.target.files?.[0]
    setPreview(file || null)
    setUser((prev) => ({ ...prev, image: file }))
  }

  function handleChange(e) {
    const { name, value } = e.target
    setUser((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    // Validação: verifica se o usuário foi carregado
    if (!user._id) {
      setFlashMessage('Aguarde o carregamento dos dados do usuário.', 'error')
      return
    }

    // Validação: verifica se as senhas correspondem (se ambas foram preenchidas)
    if (user.password && user.confirmpassword && user.password !== user.confirmpassword) {
      setFlashMessage('As senhas não correspondem.', 'error')
      return
    }

    let msgType = 'success'
    const formData = new FormData()

    const userDataToSubmit = { ...user }
    if (!userDataToSubmit.password) delete userDataToSubmit.password
    delete userDataToSubmit.confirmpassword

    Object.keys(userDataToSubmit).forEach((key) => {
      formData.append(key, userDataToSubmit[key])
    })

    const data = await api
      .patch(`/users/edit/${user._id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => response.data)
      .catch((err) => {
        msgType = 'error'
        return err.response?.data || { message: 'Erro ao atualizar usuário' }
      })

    setFlashMessage(data.message, msgType)
  }

  // Mostra carregamento enquanto os dados do usuário não são carregados
  if (loading) {
    return (
      <section className={formStyles.form_container}>
        <h2 className={styles.title}>Perfil</h2>
        <p>Carregando dados do usuário...</p>
      </section>
    )
  }

  // Se não há usuário após o carregamento, mostra mensagem
  if (!user || !user._id) {
    return (
      <section className={formStyles.form_container}>
        <h2 className={styles.title}>Perfil</h2>
        <p>Não foi possível carregar os dados do usuário. Por favor, faça login novamente.</p>
      </section>
    )
  }

  // Calcula avatarSrc apenas depois de garantir que user não é null
  const avatarSrc = preview
    ? URL.createObjectURL(preview)
    : user?.image
    ? `${process.env.REACT_APP_API}/images/users/${user.image}`
    : null

  return (
    <section className={formStyles.form_container}>
      {/* Avatar no topo (linha inteira) */}
      <div className={`${formStyles.full_row} ${formStyles.avatar_wrap}`}>
        {avatarSrc ? (
          <img className={formStyles.avatar} src={avatarSrc} alt={user.name || 'Usuário'} />
        ) : (
          <div className={formStyles.avatar} aria-label="Sem foto"></div>
        )}
      </div>

      <h2 className={styles.title}>Perfil</h2>

      <form onSubmit={handleSubmit} noValidate>
        {/* Linha 1: Imagem (upload) | Nome */}
        <Input
          text="Imagem"
          type="file"
          name="image"
          handleOnChange={onFileChange}
          accept="image/*"
        />
        <Input
          text="Nome"
          type="text"
          name="name"
          placeholder="Digite o seu nome"
          handleOnChange={handleChange}
          value={user.name || ''}
        />

        {/* Linha 2: E-mail | Telefone */}
        <Input
          text="E-mail"
          type="email"
          name="email"
          placeholder="Digite o seu e-mail"
          handleOnChange={handleChange}
          value={user.email || ''}
        />
        <Input
          text="Telefone"
          type="text"
          name="phone"
          placeholder="Digite o seu telefone"
          handleOnChange={handleChange}
          value={user.phone || ''}
        />

        {/* Linha 3: Senha | Confirmar senha */}
        <Input
          text="Senha"
          type="password"
          name="password"
          placeholder="Digite sua senha"
          handleOnChange={handleChange}
        />
        <Input
          text="Confirmar senha"
          type="password"
          name="confirmpassword"
          placeholder="Confirme sua senha"
          handleOnChange={handleChange}
        />

        {/* Botão ocupa as duas colunas (regra já está no CSS) */}
        <input type="submit" value="Editar" />
      </form>
    </section>
  )
}

export default Profile
