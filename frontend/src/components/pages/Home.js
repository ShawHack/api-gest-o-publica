import api from '../../utils/api' 
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import styles from './Home.module.css'
import useRole from '../../hooks/useRole'

const LIMIT = 20

function Home() {
    const [seps, setSeps] = useState([])
    const [expandedImage, setExpandedImage] = useState(null)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pages, setPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const { isAdmin } = useRole()

    const fetchSepultados = async (pageNum = 1) => {
        setLoading(true)
        try {
            const response = await api.get(`/sepultados?page=${pageNum}&limit=${LIMIT}`)
            const data = response.data
            
            // A API retorna: { sepultado, page, limit, total, pages }
            // Aceita tanto 'sepultado' (singular) quanto 'sepultados' (plural)
            const sepultadosArray = Array.isArray(data.sepultado) 
                ? data.sepultado 
                : Array.isArray(data.sepultados) 
                    ? data.sepultados 
                    : []
            
            setSeps(sepultadosArray)
            setPage(data.page || pageNum)
            setTotal(data.total || 0)
            setPages(data.pages || 1)
        } catch (error) {
            console.error('Erro ao buscar dados da API:', error)
            setSeps([])
            setTotal(0)
            setPages(1)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSepultados(1)
    }, [])









    const handleImageClick = (imageUrl) => {
        // Só expande se a URL não for a da imagem padrão
        if (imageUrl && !imageUrl.includes('/sep.jpeg')) {
            setExpandedImage(imageUrl)
        }
    }

    const handleCloseModal = () => {
        setExpandedImage(null)
    }

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pages) {
            fetchSepultados(newPage)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    return (
        <section>
            {isAdmin && (
                <div className={styles.admin_cards_row}>
                    <Link to="/compliance" className={styles.admin_card}>
                        <h3>Compliance LGPD</h3>
                        <p>Acompanhe alertas, trilha de auditoria e status de risco.</p>
                        <span>Acessar painel</span>
                    </Link>
                </div>
            )}
            <div className={styles.sepultado_home_header}>
                <h5>Recentes</h5>
                {total > 0 && (
                    <span style={{ fontSize: '0.9em', opacity: 0.7 }}>
                        Total: {total} sepultados
                    </span>
                )}
            </div>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>Carregando...</p>
                </div>
            ) : (
                <>
                    <div className={styles.sepultado_container}>
                        {seps.length > 0 && 
                            seps.map((sepultado) => {
                        // --- INÍCIO DA LÓGICA DE IMAGEM ROBUSTA ---
                        const IMG_BASE = '';
                        const raw = sepultado?.images?.[0];
                        const cleaned = typeof raw === 'string' ? raw.trim() : '';
                        const isBad = !cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '/';
                        
                        const srcImg = !isBad
                          ? `${IMG_BASE}/images/sepultados/${cleaned}`
                          : '/sep.jpeg';
                        // --- FIM DA LÓGICA ---

                        return (
                            <div key={sepultado._id} className={styles.sepultado_card}>
                                
                                {/* VOLTAMOS A USAR A SUA DIV ORIGINAL, MAS COM A URL SEGURA */}
                                <div  
                                    style={{backgroundImage: `url(${srcImg})`}}
                                    className={styles.sepultado_card_image}
                                    onClick={() => handleImageClick(srcImg)}
                                >
                                </div>

                                <h3>{sepultado.nome}</h3>
                                <h4>Informações da sepultura</h4>
                                <p>
                                    <span className='bold'>Rua: </span>{sepultado.rua || "Inform. desconhecida"}
                                </p>
                                <p>
                                    <span className='bold'>Quadra: </span>{sepultado.quadra || "Inform. desconhecida"}
                                </p>
                                <p>
                                    <span className='bold'>Placa: </span>{sepultado.chapa || "Inform. desconhecida"}
                                </p>
                                <Link to={`sepultados/${sepultado._id}`}>Mais detalhes</Link>
                            </div>  
                        )
                    })
                }
                        {seps.length === 0 && (
                            <p>Não há sepultados cadastrados no momento</p>
                        )}
                    </div>

                    {/* Controles de paginação */}
                    {pages > 1 && (
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            gap: '1rem',
                            marginTop: '2rem',
                            marginBottom: '2rem',
                            flexWrap: 'wrap'
                        }}>
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                style={{
                                    padding: '0.5rem 1rem',
                                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                                    opacity: page === 1 ? 0.5 : 1,
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    background: '#fff'
                                }}
                            >
                                Anterior
                            </button>
                            <span style={{ fontSize: '0.9em' }}>
                                Página {page} de {pages}
                            </span>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === pages}
                                style={{
                                    padding: '0.5rem 1rem',
                                    cursor: page === pages ? 'not-allowed' : 'pointer',
                                    opacity: page === pages ? 0.5 : 1,
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    background: '#fff'
                                }}
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* O modal continua funcionando como antes */}
            {expandedImage && (
                <div className={styles.image_modal} onClick={handleCloseModal}>
                    <div className={styles.modal_content} onClick={(e) => e.stopPropagation()}>
                        <img 
                            src={expandedImage} 
                            alt="Imagem expandida" 
                            className={styles.expanded_image}
                            onClick={handleCloseModal}
                        />
                        <button 
                            className={styles.close_button}
                            onClick={handleCloseModal}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </section>
    )
}

export default Home