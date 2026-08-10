import styles from './SepultadoDetails.module.css'
import api from '../../../utils/api'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import useFlashMessage from '../../../hooks/useFlashMessage'
import useRole from '../../../hooks/useRole'
import { MapPin, Expand } from 'lucide-react'

// emoji-mart (v5): picker + dataset
import Picker from '@emoji-mart/react'
import emojiData from '@emoji-mart/data'

function SepultadoDetails() {
  const [sep, setSep] = useState({})
  const [comentarios, setComentarios] = useState([])
  const [novoComentario, setNovoComentario] = useState('')
  const [emojis, setEmojis] = useState([])
  const [mostrarPicker, setMostrarPicker] = useState(false)
  const [imagem, setImagem] = useState(null)
  const [preview, setPreview] = useState(null)

  const [carregandoComentarios, setCarregandoComentarios] = useState(false)
  const [expandedImage, setExpandedImage] = useState(null)

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const trackRef = useRef(null)
  const [slideAtivo, setSlideAtivo] = useState(0)

  const { id } = useParams()
  const { setFlashMessage } = useFlashMessage()

  const { roleLoaded, userId, isAdmin, token: roleToken } = useRole()
  const token = roleToken || localStorage.getItem('token') || ''

  // ===== NOVO: cache (userId -> { image, name }) =====
  const [commentUsers, setCommentUsers] = useState({})

  // ===== Estado para o pluscode da quadra =====
  const [loadingPluscode, setLoadingPluscode] = useState(false)

  // dd/MM/aaaa para vários formatos de entrada
const mostrarData = (valor) => {
  if (valor == null) return 'Desconhecida'
  const s = String(valor).trim()
  if (!s) return 'Desconhecida'

  // já está em dd/MM/aaaa
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s

  // ISO curto (aaaa-MM-dd[...])
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`

  // timestamp numérico (ms)
  if (/^\d{8,}$/.test(s)) {
    const d = new Date(Number(s))
    if (!isNaN(d)) return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  }

  // strings tipo "Mon Nov 10 2025 00:00:00 GMT+0000" ou ISO completo
  const d = new Date(s)
  if (!isNaN(d)) return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })

  // se nada deu certo, devolve o que veio
  return s
}


  // Carrega dados do sepultado
  useEffect(() => {
    api.get(`/sepultados/${id}`)
      .then((r) => setSep(r.data || {}))
      .catch(() => setFlashMessage('Erro ao carregar sepultado.', 'error'))

    buscarComentarios(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Busca comentários paginados
  const buscarComentarios = async (pageArg = 1, append = false) => {
    setCarregandoComentarios(true)
    try {
      const r = await api.get(`/sepultados/${id}/comentarios`, { params: { page: pageArg, limit } })
      const items = Array.isArray(r?.data?.items) ? r.data.items : (Array.isArray(r?.data) ? r.data : [])
      setHasMore(Boolean(r?.data?.hasMore))
      setPage(pageArg)
      setComentarios(prev => append ? [...prev, ...items] : items)
    } catch {
      if (!append) setComentarios([])
    } finally {
      setCarregandoComentarios(false)
    }
  }

  // Carregar mais comentários
  const carregarMais = async () => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    await buscarComentarios(page + 1, true)
    setLoadingMore(false)
  }

  // Seleção de emoji: cola no texto e fecha o picker
const onEmojiSelect = (emoji) => {
  setNovoComentario((t) => t + emoji.native)
  setMostrarPicker(false)
}


  // Upload de imagem do comentário (mantido)
  const onChangeImagem = (e) => {
    const file = e.target.files?.[0]
    setImagem(file || null)
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }




 // Enviar comentário — JSON puro sem imagem; FormData com imagem
const adicionarComentario = async (e) => {
  e.preventDefault()
  const texto = (novoComentario || '').trim()
  if (!texto && !imagem) return
  if (!token) return setFlashMessage('Você precisa estar logado para comentar.', 'error')

  try {
    let r
    if (imagem) {
      // 🔹 COM IMAGEM: usa FormData (deixa o navegador definir Content-Type)
      const form = new FormData()
      form.append('comentario', texto)
      form.append('imagem', imagem)
      r = await api.post(`/sepultados/${id}/comentarios`, form, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } else {
      // 🔹 SEM IMAGEM: força JSON e impede qualquer conversão global para multipart
      r = await api.post(
        `/sepultados/${id}/comentarios`,
        { comentario: texto },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          // 🚫 Zera QUALQUER transformRequest global
          transformRequest: [(data) => JSON.stringify(data)],
          transitional: { silentJSONParsing: false, forcedJSONParsing: true },
        }
      )
    }

    const novo = r?.data
    if (!novo || !novo._id) {
      await buscarComentarios(1, false)
    } else {
      // O backend agora retorna os dados do usuário (user: { _id, name, image })
      // Se ainda vier apenas o ID, atualiza o cache para futuras buscas
      if (novo.user && typeof novo.user === 'object' && novo.user._id) {
        const userId = String(novo.user._id)
        setCommentUsers(prev => ({
          ...prev,
          [userId]: { image: novo.user.image, name: novo.user.name }
        }))
      }
      setComentarios((prev) => [novo, ...prev])
    }

    setNovoComentario('')
    setImagem(null)
    setPreview(null)
    setMostrarPicker(false)
    setFlashMessage('Comentário adicionado com sucesso!', 'success')
  } catch (err) {
    const status = err?.response?.status
    const backendMsg =
      err?.response?.data?.message ||
      (status === 429 ? 'Muitas homenagens em pouco tempo. Tente novamente em instantes.' : null)
    setFlashMessage(backendMsg || 'Erro ao adicionar comentário.', 'error')
  }
}








  // Remover comentário
  const podeApagar = (c) => {
    if (!roleLoaded) return false
    if (isAdmin) return true
    return userId && (String(c.user) === String(userId))
  }

  const removerComentario = async (cid) => {
    try {
      await api.delete(`/sepultados/${id}/comentarios/${cid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setComentarios(prev => prev.filter(c => c._id !== cid))
      setFlashMessage('Comentário removido.', 'success')
    } catch (err) {
      setFlashMessage(err?.response?.data?.message || 'Erro ao remover comentário.', 'error')
    }
  }

  // Datas de comentários
  const mostrarCreatedAt = (v) => {
    if (!v) return ''
    try {
      const d = new Date(v)
      if (isNaN(d.getTime())) return String(v)
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch {
      return String(v)
    }
  }

  const handleImageClick = (imageUrl) => {
    console.log('Clique na imagem:', imageUrl) // Debug
    setExpandedImage(imageUrl)
  }
  const handleCloseModal = () => setExpandedImage(null)

  // Fechar modal com tecla ESC
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && expandedImage) {
        handleCloseModal()
      }
    }

    if (expandedImage) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevenir scroll do body quando modal está aberto
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [expandedImage])

  // Função para buscar o pluscode da quadra e abrir o Google Maps
  const handleOpenMaps = async () => {
    const quadra = sep?.quadra || sep?.Quadra
    if (!quadra || !String(quadra).trim()) {
      setFlashMessage('Quadra não informada para este sepultado.', 'error')
      return
    }

    const quadraNormalizada = String(quadra).trim()
    setLoadingPluscode(true)
    try {
      const response = await api.get(`/dloc/${encodeURIComponent(quadraNormalizada)}`)
      const pluscode = response.data?.pluscode
      
      if (!pluscode) {
        setFlashMessage('Plus code não encontrado para esta quadra.', 'error')
        setLoadingPluscode(false)
        return
      }

      // Abre o Google Maps com o pluscode
      // Formato: https://www.google.com/maps/search/?api=1&query=PLUSCODE
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pluscode)}`
      window.open(mapsUrl, '_blank')
      setFlashMessage('Abrindo localização no Google Maps...', 'success')
    } catch (error) {
      console.error('Erro ao buscar quadra:', error)
      const status = error.response?.status
      const data = error.response?.data
      
      let message = 'Erro ao buscar localização da quadra.'
      if (status === 404) {
        message = data?.message || `Quadra "${quadraNormalizada}" não encontrada no sistema.`
      } else if (status === 422) {
        message = data?.message || 'Quadra inválida.'
      } else if (status === 500) {
        message = data?.message || 'Erro interno do servidor ao buscar localização.'
      } else if (error.message) {
        message = `Erro: ${error.message}`
      }
      
      setFlashMessage(message, 'error')
    } finally {
      setLoadingPluscode(false)
    }
  }

  // Imagens do sepultado (carrossel) - servidas em /images/ (não em /api/images/)
  const IMG_BASE = ''
  const imageList = Array.isArray(sep?.images) ? sep.images : []
  const imageSources = imageList
    .map(img => {
      const cleaned = typeof img === 'string' ? img.trim() : ''
      const isBad = !cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '/'
      return !isBad ? `${IMG_BASE}/images/sepultados/${cleaned}` : '/sepultura-padrao.jpeg'
    })
    .filter(Boolean)
  if (imageSources.length === 0 && sep?._id) imageSources.push('/sepultura-padrao.jpeg')

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onScroll = () => {
      const vw = el.clientWidth || 1
      const idx = Math.round(el.scrollLeft / vw)
      setSlideAtivo(Math.min(Math.max(idx, 0), Math.max(imageSources.length - 1, 0)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [imageSources.length])

  useEffect(() => {
    if (slideAtivo > imageSources.length - 1) {
      setSlideAtivo(Math.max(imageSources.length - 1, 0))
    }
  }, [imageSources.length, slideAtivo])

  const irParaSlide = (idx) => {
    const el = trackRef.current
    if (!el) return
    const largura = el.clientWidth
    el.scrollTo({ left: idx * largura, behavior: 'smooth' })
    setSlideAtivo(idx)
  }

  // ===== caminho base das fotos de usuários (/images/users/ na raiz) =====
  const USERS_IMG_DIR = '/images/users/'

  // Monta URL do avatar a partir de filename ou URL absoluta
  const getAvatarUrl = (fileOrUrl) => {
    if (!fileOrUrl) return null
    if (/^https?:\/\//i.test(fileOrUrl)) return fileOrUrl
    return `${IMG_BASE}${USERS_IMG_DIR}${String(fileOrUrl).replace(/^\/+/, '')}`
  }

  // Resolve a melhor foto para o comentário: autorImage -> user.image (obj) -> cache -> null
  const resolveAvatarForComment = (c) => {
    // Prioridade 1: autorImage (retornado pelo backend)
    if (c?.autorImage) {
      const u = getAvatarUrl(c.autorImage)
      if (u) return u
    }
    // Prioridade 2: user.image quando user é objeto
    if (c?.user && typeof c.user === 'object' && c.user.image) {
      const u = getAvatarUrl(c.user.image)
      if (u) return u
    }
    // Prioridade 3: cache de usuários
    const uid = typeof c?.user === 'string' || typeof c?.user === 'number'
      ? String(c.user)
      : (c?.user?._id ? String(c.user._id) : null)
    if (uid && commentUsers[uid]?.image) {
      const u = getAvatarUrl(commentUsers[uid].image)
      if (u) return u
    }
    return null
  }

  // ===== NOVO: buscar autores que não vieram populados nem estão no cache =====
  useEffect(() => {
    if (!Array.isArray(comentarios) || comentarios.length === 0) return
    const ids = []
    for (const c of comentarios) {
      if (c?.user && typeof c.user === 'object') continue // já veio populado
      const uid = typeof c?.user === 'string' || typeof c?.user === 'number'
        ? String(c.user)
        : null
      if (uid && !commentUsers[uid] && !ids.includes(uid)) ids.push(uid)
    }
    if (!ids.length) return

    let cancelled = false
    ;(async () => {
      try {
        const results = await Promise.allSettled(
          ids.map(uid =>
            api.get(`/users/${uid}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
          )
        )
        const map = {}
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value?.data?.user) {
            const u = r.value.data.user
            map[String(u._id)] = { image: u.image, name: u.name }
          }
        }
        if (!cancelled && Object.keys(map).length) {
          setCommentUsers(prev => ({ ...prev, ...map }))
        }
      } catch {
        // segue com placeholder
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comentarios, token])

  return (
    <section className={styles.sepultado_details_container}>
      <div className={styles.sepultado_details_header}>
        <h1>{sep?.nome || 'Carregando...'}</h1>
      </div>

      {/* --- CARROSSEL / GRID DE IMAGENS --- */}
      {imageSources.length > 0 && (
        <div className={styles.sepultado_images}>
          <div className={styles.carousel_track} ref={trackRef}>
            {imageSources.map((src, index) => (
              <div className={styles.slide} key={index}>
                <img
                  src={src}
                  alt={`${sep?.nome || 'Sepultado'} - foto ${index + 1}`}
                  onClick={() => handleImageClick(src)}
                  onError={(e) => { e.currentTarget.src = '/sepultura-padrao.jpeg' }}
                />
              </div>
            ))}
          </div>

          {imageSources.length > 1 && (
            <div className={styles.dots}>
              {imageSources.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.dot} ${i === slideAtivo ? styles.dot_active : ''}`}
                  onClick={() => irParaSlide(i)}
                  aria-label={`Ir para foto ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.main_content}>
        {/* Coluna esquerda: dados */}
        <div className={styles.left_column}>
          <div className={styles.info_section}>
            <h3>Dados Pessoais</h3>
            <div className={styles.info_grid}>
              <div className={styles.info_item}><span className={styles.label}>Falecimento:</span><span className={styles.value}>{mostrarData(sep?.dtFal)}</span></div>
              <div className={styles.info_item}><span className={styles.label}>Nascimento:</span><span className={styles.value}>{mostrarData(sep?.dtNasc)}</span></div>
              <div className={styles.info_item}><span className={styles.label}>Idade:</span><span className={styles.value}>{sep?.idade ?? 'Desconhecida'}</span></div>
              <div className={styles.info_item}><span className={styles.label}>Naturalidade:</span><span className={styles.value}>{sep?.nacionalidade || 'Desconhecida'}</span></div>
              <div className={styles.info_item}><span className={styles.label}>Pai:</span><span className={styles.value}>{sep?.pai || 'Informação desconhecida'}</span></div>
              <div className={styles.info_item}><span className={styles.label}>Mãe:</span><span className={styles.value}>{sep?.mae || 'Informação desconhecida'}</span></div>
            </div>
          </div>

          <div className={styles.info_section}>
            <h3>Dados da Sepultura</h3>
            <div className={styles.info_grid}>
              <div className={styles.info_item}><span className={styles.label}>Cemitério:</span><span className={styles.value}>{sep?.cemiterio || 'Informação desconhecida'}</span></div>
              <div className={styles.info_item}><span className={styles.label}>Rua:</span><span className={styles.value}>{sep?.rua || 'Informação desconhecida'}</span></div>
              <div className={styles.info_item}><span className={styles.label}>Quadra:</span><span className={styles.value}>{sep?.quadra || 'Informação desconhecida'}</span></div>
              <div className={styles.info_item}><span className={styles.label}>Placa:</span><span className={styles.value}>{sep?.chapa || 'Informação desconhecida'}</span></div>
              <div className={styles.info_item}><span className={styles.label}>Tipo de Sepultura:</span><span className={styles.value}>{sep?.tipoSepultura || 'Informação desconhecida'}</span></div>
            </div>
          </div>

          <div className={styles.epitafio_section}>
            <h3>Epitáfio</h3>
            <div className={styles.epitafio_content}><p>"{sep?.epitafio || 'Descanse em paz'}"</p></div>
          </div>
        </div>

        {/* Coluna direita: comentários */}
        <div className={styles.right_column}>
          <div className={styles.comments_section}>
            <h3>Homenagens</h3>

            <form onSubmit={adicionarComentario} className={styles.comment_form}>
              <textarea
                placeholder="Deixe sua homenagem..."
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                className={styles.comment_textarea}
                rows="4"
              />

              <div className={styles.comment_tools}>
                <button
                  type="button"
                  className={styles.emoji_button}
                  onClick={() => setMostrarPicker(v => !v)}
                  aria-label="Inserir emoji"
                >
                  😊
                </button>

                {mostrarPicker && (
                  <div className={styles.emoji_picker} onMouseLeave={() => setMostrarPicker(false)}>
                    <Picker
                      data={emojiData}
                      onEmojiSelect={onEmojiSelect}
                      locale="pt"
                      theme="light"
                    />
                  </div>
                )}

                {/* Botão "Enviar foto" oculto conforme solicitado */}
                <label className={styles.file_button} style={{ display: 'none' }}>
                  <input type="file" accept="image/*" onChange={onChangeImagem} />
                  Enviar foto
                </label>
              </div>

              {preview && (
                <div className={styles.comment_preview}>
                  <img src={preview} alt="Pré-visualização" />
                  <button
                    type="button"
                    className={styles.remove_preview}
                    onClick={() => { setImagem(null); setPreview(null) }}
                  >
                    Remover
                  </button>
                </div>
              )}

              <button type="submit" className={styles.submit_button}>
                Adicionar Homenagem
              </button>
            </form>

            <div className={styles.comments_list}>
              {carregandoComentarios ? (
                <div className={styles.loading}>Carregando comentários...</div>
              ) : comentarios.length > 0 ? (
                <>
                  {comentarios.map((c, i) => (
                    <div key={c._id || i} className={styles.comment_item}>
                      <div className={styles.comment_header}>
                        {/* ===== Avatar do autor na frente do nome ===== */}
                        {(() => {
                          const avatarUrl = resolveAvatarForComment(c)
                          const finalAvatarUrl = avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(c.autor || c?.user?.name || 'Anônimo') + '&background=364ba3&color=fff&size=80'
                          return (
                            <img
                              className={styles.comment_avatar}
                              src={finalAvatarUrl}
                              alt={c.autor || c?.user?.name || 'Anônimo'}
                              onClick={() => handleImageClick(finalAvatarUrl)}
                              onError={(e) => {
                                // Se falhar, usa avatar gerado por API
                                const fallbackUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(c.autor || c?.user?.name || 'Anônimo') + '&background=364ba3&color=fff&size=80'
                                e.currentTarget.src = fallbackUrl
                              }}
                              loading="lazy"
                              title="Clique para expandir o avatar"
                            />
                          )
                        })()}
                        <span className={styles.comment_author}>
                          {c.autor || (c?.user?.name) || 'Anônimo'}
                        </span>
                        <span className={styles.comment_date}>{mostrarCreatedAt(c.createdAt)}</span>
                        {podeApagar(c) && (
                          <button
                            type="button"
                            className={styles.delete_button}
                            onClick={() => removerComentario(c._id)}
                            title="Remover comentário"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      {c.texto && <p className={styles.comment_text}>{c.texto}</p>}

                      {/* imagem anexada no comentário (fluxo mantido) */}
                      {c.imagem && (
                        <img
                          src={`${IMG_BASE}/images/sepultados/${c.imagem}`}
                          alt="Imagem do comentário"
                          className={styles.comment_image}
                          onClick={() => handleImageClick(`${IMG_BASE}/images/sepultados/${c.imagem}`)}
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                          title="Clique para expandir a imagem"
                        />
                      )}

                      {/* emojis salvos */}
                      {Array.isArray(c.emojis) && c.emojis.length > 0 && (
                        <div className={styles.comment_emojis} aria-label="emojis do comentário">
                          {c.emojis.map((e, idx) => (
                            <span key={`${c._id}-e-${idx}`} className={styles.comment_emoji}>{e}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {hasMore && (
                    <div className={styles.load_more_wrap}>
                      <button onClick={carregarMais} disabled={loadingMore} className={styles.load_more_button}>
                        {loadingMore ? 'Carregando…' : 'Carregar mais'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.no_comments}>
                  <p>Seja o primeiro a deixar uma homenagem.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de imagem ampliada */}
      {expandedImage && (
        <div className={styles.image_modal} onClick={handleCloseModal}>
          <div className={styles.modal_content} onClick={(e) => e.stopPropagation()}>
            <img src={expandedImage} alt="Imagem expandida" className={styles.expanded_image} onClick={handleCloseModal} />
            <button className={styles.close_button} onClick={handleCloseModal}>×</button>
          </div>
        </div>
      )}

      {/* Botão flutuante para localização da quadra */}
      {(sep?.quadra || sep?.Quadra) && String(sep?.quadra || sep?.Quadra || '').trim() && (
        <button
          className={styles.floating_location_button}
          onClick={handleOpenMaps}
          disabled={loadingPluscode}
          title="Ver localização da quadra no Google Maps"
          aria-label="Ver localização da quadra no Google Maps"
        >
          <MapPin size={20} />
          <span>{loadingPluscode ? 'Carregando...' : 'Quadra'}</span>
        </button>
      )}
    </section>
  )
}

export default SepultadoDetails