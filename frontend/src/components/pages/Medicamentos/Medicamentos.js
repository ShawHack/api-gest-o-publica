import { useState, useEffect, useRef } from 'react'
import api from '../../../utils/api'
import styles from './Medicamentos.module.css'
import { Pill, Search, Bot, RefreshCw, ChevronDown, ChevronUp, Send, Building2, AlertTriangle, CheckCircle, Phone, MapPin, Clock, ArrowLeft } from 'lucide-react'

function Medicamentos() {
  const [tab, setTab] = useState('resumo')
  const [resumo, setResumo] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [expandedFarmacia, setExpandedFarmacia] = useState(null)

  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Olá! Sou Miti  o assistente da SEMIT. Pergunte-me sobre medicamentos, disponibilidade, estoques ou qualquer dúvida relacionada.' }
  ])
  const [pergunta, setPergunta] = useState('')
  const [iaLoading, setIaLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => { fetchResumo() }, [])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchResumo = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/medicamentos/resumo')
      setResumo(data.resumo || [])
    } catch (err) {
      console.error('Erro ao buscar resumo:', err)
      setResumo([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchTerm.trim() || searchTerm.trim().length < 2) return
    setSearchLoading(true)
    try {
      const { data } = await api.get(`/medicamentos/buscar?q=${encodeURIComponent(searchTerm.trim())}`)
      setSearchResults(data)
    } catch (err) {
      console.error('Erro na busca:', err)
      setSearchResults({ termo: searchTerm, resultados: [] })
    } finally {
      setSearchLoading(false)
    }
  }

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!pergunta.trim() || pergunta.trim().length < 5) return
    const userMsg = { role: 'user', text: pergunta.trim() }
    setMessages(prev => [...prev, userMsg])
    setPergunta('')
    setIaLoading(true)
    try {
      const { data } = await api.post('/medicamentos/consultar', { pergunta: userMsg.text })
      setMessages(prev => [...prev, { role: 'assistant', text: data.resposta }])
    } catch (err) {
      const errMsg = err?.response?.data?.error || 'Desculpe, ocorreu um erro ao processar sua pergunta.'
      setMessages(prev => [...prev, { role: 'assistant', text: errMsg, error: true }])
    } finally {
      setIaLoading(false)
    }
  }

  const toggleFarmacia = (nome) => {
    setExpandedFarmacia(prev => prev === nome ? null : nome)
  }

  const totalMedicamentos = resumo.reduce((acc, f) => acc + f.totalMedicamentos, 0)

  return (
    <div className={styles.page}>
      {/* ============ NAVBAR ============ */}
      <nav className={styles.navbar}>
        <div className={styles.navbar_inner}>
          <div className={styles.navbar_brand}>
            <div className={styles.navbar_logo}>
              <Pill size={28} />
            </div>
            <div>
              <h1>Farmácia Municipal</h1>
              <span>Prefeitura de Garça</span>
            </div>
          </div>
          <div className={styles.navbar_links}>
            <a href="https://garca.sp.gov.br" target="_blank" rel="noopener noreferrer">
              Portal Prefeitura
            </a>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <div className={styles.hero}>
        <div className={styles.hero_inner}>
          <h2>Consulta de Medicamentos</h2>
          <p>Dados atualizados do Portal da Transparência da Farmácia Municipal de Garça-SP</p>
        </div>
      </div>

      {/* ============ CONTEÚDO ============ */}
      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'resumo' ? styles.tab_active : ''}`} onClick={() => setTab('resumo')}>
              <Building2 size={16} />
              <span>Resumo</span>
            </button>
            <button className={`${styles.tab} ${tab === 'buscar' ? styles.tab_active : ''}`} onClick={() => setTab('buscar')}>
              <Search size={16} />
              <span>Buscar</span>
            </button>
            <button className={`${styles.tab} ${tab === 'ia' ? styles.tab_active : ''}`} onClick={() => setTab('ia')}>
              <Bot size={16} />
              <span>Assistente IA</span>
            </button>
          </div>

          {tab !== 'resumo' && (
            <button className={styles.mobile_back_btn} onClick={() => setTab('resumo')}>
              <ArrowLeft size={16} />
              <span>Voltar ao Resumo</span>
            </button>
          )}

          {/* ABA RESUMO */}
          {tab === 'resumo' && (
            <div className={styles.tab_content}>
              <div className={styles.stats_row}>
                <div className={styles.stat_card}>
                  <span className={styles.stat_number}>{resumo.length}</span>
                  <span className={styles.stat_label}>Farmácias</span>
                </div>
                <div className={styles.stat_card}>
                  <span className={styles.stat_number}>{totalMedicamentos}</span>
                  <span className={styles.stat_label}>Itens cadastrados</span>
                </div>
              </div>

              {loading ? (
                <div className={styles.loading}>
                  <RefreshCw className={styles.spin} size={24} />
                  <span>Carregando dados do portal...</span>
                </div>
              ) : (
                <div className={styles.farmacias_list}>
                  {resumo.map((f) => (
                    <div key={f.farmacia} className={styles.farmacia_card}>
                      <div className={styles.farmacia_header} onClick={() => toggleFarmacia(f.farmacia)}>
                        <div className={styles.farmacia_info}>
                          <Building2 size={18} className={styles.farmacia_icon} />
                          <h3>{f.farmacia}</h3>
                        </div>
                        <div className={styles.farmacia_badges}>
                          <span className={styles.badge_ok}><CheckCircle size={14} />{f.disponiveis}</span>
                          {f.emFalta > 0 && (<span className={styles.badge_falta}><AlertTriangle size={14} />{f.emFalta} em falta</span>)}
                          {expandedFarmacia === f.farmacia ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                      {expandedFarmacia === f.farmacia && (
                        <div className={styles.farmacia_details}>
                          <div className={styles.detail_row}><span>Total de medicamentos:</span><strong>{f.totalMedicamentos}</strong></div>
                          <div className={styles.detail_row}><span>Disponíveis:</span><strong className={styles.text_ok}>{f.disponiveis}</strong></div>
                          <div className={styles.detail_row}>
                            <span>Percentual em falta:</span>
                            <strong className={f.emFalta > 0 ? styles.text_falta : styles.text_ok}>{f.percentualFalta}</strong>
                          </div>
                          {f.medicamentosEmFalta.length > 0 && (
                            <div className={styles.falta_section}>
                              <h4><AlertTriangle size={16} />Medicamentos em falta:</h4>
                              <ul>{f.medicamentosEmFalta.map((m, i) => (<li key={i}>{m}</li>))}</ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA BUSCAR */}
          {tab === 'buscar' && (
            <div className={styles.tab_content}>
              <form onSubmit={handleSearch} className={styles.search_form}>
                <div className={styles.search_wrapper}>
                  <Search size={18} className={styles.search_icon} />
                  <input type="text" placeholder="Digite o nome do medicamento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={styles.search_input} />
                </div>
                <button type="submit" className={styles.search_btn} disabled={searchLoading || searchTerm.trim().length < 2}>
                  {searchLoading ? <RefreshCw className={styles.spin} size={18} /> : 'Buscar'}
                </button>
              </form>
              {searchResults && (
                <div className={styles.results}>
                  <h3>Resultados para "<em>{searchResults.termo}</em>"</h3>
                  {searchResults.resultados.length === 0 ? (
                    <p className={styles.no_results}>Nenhum medicamento encontrado.</p>
                  ) : (
                    searchResults.resultados.map((r) => (
                      <div key={r.farmacia} className={styles.result_group}>
                        <h4><Building2 size={16} />{r.farmacia}</h4>
                        <div className={styles.result_table_wrapper}>
                          <table className={styles.result_table}>
                            <thead><tr><th>Medicamento</th><th>Estoque</th><th>Disponível</th></tr></thead>
                            <tbody>
                              {r.medicamentos.map((m, i) => (
                                <tr key={i} className={!m.disponivel ? styles.row_falta : ''}>
                                  <td>{m.nome}</td>
                                  <td className={styles.td_center}>{m.estoque}</td>
                                  <td className={styles.td_center}>
                                    {m.disponivel ? <CheckCircle size={16} className={styles.icon_ok} /> : <AlertTriangle size={16} className={styles.icon_falta} />}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* ABA IA */}
          {tab === 'ia' && (
            <div className={styles.tab_content}>
              <div className={styles.chat_container}>
                <div className={styles.chat_messages}>
                  {messages.map((msg, i) => (
                    <div key={i} className={`${styles.chat_bubble} ${msg.role === 'user' ? styles.bubble_user : styles.bubble_assistant} ${msg.error ? styles.bubble_error : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className={styles.bubble_avatar}>
                          <img src="/miti-logo.png" alt="Miti" className={styles.bubble_avatar_image} />
                        </div>
                      )}
                      <div className={styles.bubble_text}>
                        {msg.text.split('\n').map((line, j) => (<span key={j}>{line}<br /></span>))}
                      </div>
                    </div>
                  ))}
                  {iaLoading && (
                    <div className={`${styles.chat_bubble} ${styles.bubble_assistant}`}>
                      <div className={styles.bubble_avatar}>
                        <img src="/miti-logo.png" alt="Miti" className={styles.bubble_avatar_image} />
                      </div>
                      <div className={styles.bubble_text}><span className={styles.typing}>Analisando dados</span></div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleAsk} className={styles.chat_form}>
                  <input type="text" placeholder="Pergunte sobre medicamentos, disponibilidade, estoques..." value={pergunta} onChange={(e) => setPergunta(e.target.value)} className={styles.chat_input} disabled={iaLoading} />
                  <button type="submit" className={styles.chat_send} disabled={iaLoading || pergunta.trim().length < 5}><Send size={18} /></button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className={styles.footer}>
        <div className={styles.footer_inner}>
          <div className={styles.footer_col}>
            <h3>Farmácia Municipal de Garça</h3>
            <p>Consulta pública de medicamentos disponíveis nas unidades de saúde do município.</p>
          </div>
          <div className={styles.footer_col}>
            <h4>Contato</h4>
            <p><MapPin size={14} /> Rua Brigadeiro Machado, nº 244, Bairro Williams</p>
            <p><Phone size={14} /> (14) 3471-4959</p>
          </div>
          <div className={styles.footer_col}>
            <h4>Horário</h4>
            <p><Clock size={14} /> Seg. a Sex. — 8h às 17h</p>
          </div>
        </div>
        <div className={styles.footer_bottom}>
          <p>&copy; {new Date().getFullYear()} Prefeitura Municipal de Garça — SEMIT</p>
        </div>
      </footer>
    </div>
  )
}

export default Medicamentos
