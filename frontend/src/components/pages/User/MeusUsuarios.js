import api from '../../../utils/api';
import {
    useState,
    useEffect,
    useCallback
} from 'react';
import {
    Link
} from 'react-router-dom';
import styles from './../Sepultado/Dashboard.module.css';
import useFlashMessage from '../../../hooks/useFlashMessage';

// 1. Importe o componente RoundedImage para padronizar o visual
import RoundedImage from '../../layout/RoundedImage';

const LIMIT = 20;

export default function MeusUsuarios() {
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [q, setQ] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        usuario: 0,
        concessionario: 0,
        admin: 0
    });
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const {
        setFlashMessage
    } = useFlashMessage();

  const readToken = useCallback(() => {
        const auth = JSON.parse(localStorage.getItem('auth') || '{}');
        const fromAuth = auth.token;
    if (fromAuth) return fromAuth;
    const raw = localStorage.getItem('token');
    if (!raw) return '';
        try {
            return JSON.parse(raw);
        } catch {
            return raw.replace(/^"+|"+$/g, '');
        }
  }, []);
  const token = readToken();

  useEffect(() => {
    if (!token) return;

        api.get('/users/checkuser', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
      .then(res => setMe(res.data))
      .catch(() => setFlashMessage('Falha ao checar usuário.', 'error'));
  }, [token, setFlashMessage]);

    const fetchList = useCallback(async (query, pageNum = 1) => {
        try {
            const res = await api.get(`/users?q=${encodeURIComponent(query)}&page=${pageNum}&limit=${LIMIT}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = res.data || {};
            const list = data.users || [];
      setUsers(list);
            setPage(data.page || pageNum);
            setPages(data.pages || 1);

      // Preenche contadores vindos do backend (roleCounts) — filtrados por q
            if (data.roleCounts) {
                setStats(data.roleCounts);
      } else {
                // Fallback: conta localmente
                const total = list.length;
                const usuario = list.filter(u => u.role === 'usuario').length;
                const concessionario = list.filter(u => u.role === 'concessionario').length;
                const admin = list.filter(u => u.role === 'admin').length;
        setStats({
                    total,
                    usuario,
                    concessionario,
                    admin
        });
      }
    } catch (err) {
            console.error('Erro ao buscar usuários:', err);
            setFlashMessage('Erro ao buscar usuários.', 'error');
    }
  }, [token, setFlashMessage]);

  useEffect(() => {
        if (!token) return;
        fetchList(q, 1);
    }, [fetchList, q, token]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1); // Reset para página 1 ao pesquisar
        fetchList(q, 1);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        fetchList(q, newPage);
    };

    const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;

        try {
            await api.delete(`/users/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setFlashMessage('Usuário excluído com sucesso!', 'success');
            fetchList(q, page); // Recarrega a lista
    } catch (err) {
            const response = err.response || {};
            const data = response.data || {};
            const msg = data.message || 'Erro ao excluir usuário.';
      setFlashMessage(msg, 'error');
    }
    };

    // Verifica se o usuário atual é admin
    const isAdmin = me && me.role === 'admin';
  const canAdd = isAdmin;

    // Função para determinar se pode editar um usuário
    const canEdit = (user) => {
        if (!me) return false;
        if (me.role === 'admin') return true; // Admin pode editar qualquer um
        return me._id === user._id; // Usuário comum só pode editar a si mesmo
    };

    // Função para determinar se pode excluir um usuário
    const canDelete = (user) => {
        if (!me) return false;
        if (me.role !== 'admin') return false; // Só admin pode excluir
        return me._id !== user._id; // Admin não pode excluir a si mesmo
    };

    const avatarSrc = (user) => {
        if (!user || !user.image) return '/sepultura-padrao.jpeg';
        return `/images/users/${user.image}`;
    };

    return ( <
        section >
        <
        h2 style = {
            {
                color: '#364ba3',
                fontFamily: 'Rubik, sans-serif',
                fontSize: '2.2rem',
                textAlign: 'center',
                marginBottom: '24px',
                fontWeight: '600'
            }
        } >
        Gerenciamento de Usuários <
        /h2>

        {
            /* Resumo de totais — apenas admin */ } {
            isAdmin && ( <
                div style = {
                    {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                        marginBottom: '24px',
                        padding: '20px',
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                        borderRadius: '12px',
                        border: '2px solid #e0e6ed'
                    }
                } > {
                    /* Card Total */ } <
                div style = {
                    {
                        background: 'linear-gradient(135deg, #364ba3 0%, #7481d1 100%)',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '10px',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(54, 75, 163, 0.2)'
                    }
                } >
                <
                div style = {
                    {
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '4px'
                    }
                } > {
                    stats.total
                } <
                /div> <
                div style = {
                    {
                        fontSize: '0.9rem',
                        opacity: 0.9
                    }
                } >
                Total de usuários <
                /div> <
                /div>

                {
                    /* Card Usuários */ } <
                div style = {
                    {
                        background: 'linear-gradient(135deg, #749666 0%, #8fb377 100%)',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '10px',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(116, 150, 102, 0.2)'
                    }
                } >
                <
                div style = {
                    {
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '4px'
                    }
                } > {
                    stats.usuario
                } <
                /div> <
                div style = {
                    {
                        fontSize: '0.9rem',
                        opacity: 0.9
                    }
                } >
                Usuários <
                /div> <
                /div>

                {
                    /* Card Concessionários */ } <
                div style = {
                    {
                        background: 'linear-gradient(135deg, #56b8c7 0%, #6bc4d1 100%)',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '10px',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(86, 184, 199, 0.2)'
                    }
                } >
                <
                div style = {
                    {
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '4px'
                    }
                } > {
                    stats.concessionario
                } <
                /div> <
                div style = {
                    {
                        fontSize: '0.9rem',
                        opacity: 0.9
                    }
                } >
                Concessionários <
                /div> <
                /div>

                {
                    /* Card Administradores */ } <
                div style = {
                    {
                        background: 'linear-gradient(135deg, #ed9756 0%, #f1a668 100%)',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '10px',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(237, 151, 86, 0.2)'
                    }
                } >
                <
                div style = {
                    {
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '4px'
                    }
                } > {
                    stats.admin
                } <
                /div> <
                div style = {
                    {
                        fontSize: '0.9rem',
                        opacity: 0.9
                    }
                } >
                Administradores <
                /div> <
                /div> <
                /div>
            )
        }

        <
        div className = {
            styles.seplist_header
        } > {
            canAdd ? ( <
                Link to = "/usuarios/add" > Adicionar Usuário < /Link>
            ) : ( <
                span className = {
                    styles.helptext
                } > Você pode editar apenas o seu próprio perfil. < /span>
            )
        } <
        /div>

        {
            /* Busca */ } <
        div className = {
            styles.seplist_header
        } >
        <
        form onSubmit = {
            handleSearch
        }
        style = {
            {
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
            }
        } >
        <
        input type = "text"
        placeholder = "Buscar por nome, email ou CPF..."
        value = {
            q
        }
        onChange = {
            (e) => setQ(e.target.value)
        }
        className = {
            styles.search_input
        }
        style = {
            {
                flex: 1,
                minWidth: '200px'
            }
        }
        /> <
        button type = "submit"
        className = {
            styles.search_button
        } >
        Buscar <
        /button> <
        button type = "button"
        onClick = {
            () => {
                setQ('');
                setPage(1);
                fetchList('', 1);
            }
        }
        className = {
            styles.search_button
        }
        style = {
            {
                background: '#6c757d'
            }
        } >
        Limpar <
        /button> <
        /form> <
        /div>

        {
            /* Lista de usuários com formatação melhorada */ } <
        div style = {
            {
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }
        } > {
            users.length === 0 ? ( <
                div className = {
                    styles.empty_state
                } >
                <
                div style = {
                    {
                        fontSize: '3rem',
                        marginBottom: '16px'
                    }
                } > 👥 < /div> <
                h3 style = {
                    {
                        margin: '0 0 8px 0',
                        color: '#364ba3',
                        fontFamily: 'Rubik, sans-serif',
                        fontSize: '1.3rem',
                        fontWeight: '600'
                    }
                } >
                Nenhum usuário encontrado <
                /h3> <
                p style = {
                    {
                        margin: '0',
                        color: '#666',
                        fontFamily: 'Rubik, sans-serif',
                        fontSize: '1rem',
                        opacity: 0.8
                    }
                } > {
                    q ? `Não há usuários que correspondam à busca "${q}"` : 'Não há usuários cadastrados no sistema'
                } <
                /p> <
                /div>
            ) : (
                users.map((user) => ( <
                    div key = {
                        user._id
                    }
                    style = {
                        {
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            border: '2px solid #e0e6ed',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 4px 12px rgba(54, 75, 163, 0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.3s ease'
                        }
                    } >
                    <
                    div style = {
                        {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            flex: 1
                        }
                    } >
                    <
                    RoundedImage src = {
                        avatarSrc(user)
                    }
                    alt = {
                        user.name
                    }
                    width = "60"
                    style = {
                        {
                            border: '3px solid #364ba3',
                            boxShadow: '0 2px 8px rgba(54, 75, 163, 0.2)'
                        }
                    }
                    /> <
                    div style = {
                        {
                            flex: 1
                        }
                    } >
                    <
                    h3 style = {
                        {
                            margin: '0 0 12px 0',
                            color: '#364ba3',
                            fontFamily: 'Rubik, sans-serif',
                            fontSize: '1.3rem',
                            fontWeight: '600'
                        }
                    } > {
                        user.name
                    } <
                    /h3>

                    <
                    div style = {
                        {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '12px',
                            marginBottom: '12px'
                        }
                    } >
                    <
                    div style = {
                        {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 12px',
                            background: 'rgba(54, 75, 163, 0.1)',
                            borderRadius: '8px'
                        }
                    } >
                    <
                    span style = {
                        {
                            background: '#7481d1',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '50%',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            minWidth: '24px',
                            textAlign: 'center'
                        }
                    } > 📧
                    <
                    /span> <
                    span style = {
                        {
                            color: '#333',
                            fontFamily: 'Rubik, sans-serif',
                            fontSize: '0.95rem'
                        }
                    } > {
                        user.email
                    } <
                    /span> <
                    /div>

                    <
                    div style = {
                        {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 12px',
                            background: user.role === 'admin' ? 'rgba(237, 151, 86, 0.1)' : user.role === 'concessionario' ? 'rgba(86, 184, 199, 0.1)' : 'rgba(116, 150, 102, 0.1)',
                            borderRadius: '8px'
                        }
                    } >
                    <
                    span style = {
                        {
                            background: user.role === 'admin' ? '#ed9756' : user.role === 'concessionario' ? '#56b8c7' : '#749666',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '50%',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            minWidth: '24px',
                            textAlign: 'center'
                        }
                    } > {
                        user.role === 'admin' ? '👑' : user.role === 'concessionario' ? '🏢' : '👤'
                    } <
                    /span> <
                    span style = {
                        {
                            color: '#333',
                            fontFamily: 'Rubik, sans-serif',
                            textTransform: 'capitalize',
                            fontSize: '0.95rem',
                            fontWeight: '500'
                        }
                    } > {
                        user.role
                    } <
                    /span> <
                    /div> <
                    /div>

                    <
                    div style = {
                        {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px'
                        }
                    } >
                    <
                    div style = {
                        {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 10px',
                            background: 'rgba(54, 75, 163, 0.05)',
                            borderRadius: '6px'
                        }
                    } >
                    <
                    span style = {
                        {
                            background: '#364ba3',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                        }
                    } >
                    CPF <
                    /span> <
                    span style = {
                        {
                            color: '#666',
                            fontFamily: 'Rubik, sans-serif',
                            fontSize: '0.9rem'
                        }
                    } > {
                        user.cpf
                    } <
                    /span> <
                    /div>

                    <
                    div style = {
                        {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 10px',
                            background: 'rgba(116, 150, 102, 0.05)',
                            borderRadius: '6px'
                        }
                    } >
                    <
                    span style = {
                        {
                            background: '#749666',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                        }
                    } >
                    TEL <
                    /span> <
                    span style = {
                        {
                            color: '#666',
                            fontFamily: 'Rubik, sans-serif',
                            fontSize: '0.9rem'
                        }
                    } > {
                        user.phone
                    } <
                    /span> <
                    /div> <
                    /div> <
                    /div> <
                    /div>

                    <
                    div style = {
                        {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            minWidth: '120px'
                        }
                    } > {
                        canEdit(user) && ( <
                            Link to = {
                                `/usuarios/edit/${user._id}`
                            }
                            style = {
                                {
                                    background: '#364ba3',
                                    color: 'white',
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontFamily: 'Rubik, sans-serif',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    textAlign: 'center',
                                    transition: 'all 0.3s ease',
                                    border: '2px solid #364ba3',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }
                            } >
                            ✏️Editar <
                            /Link>
                        )
                    } {
                        canDelete(user) && ( <
                            button onClick = {
                                () => handleDelete(user._id)
                            }
                            style = {
                                {
                                    background: '#a02e2e',
                                    color: 'white',
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    border: '2px solid #a02e2e',
                                    fontFamily: 'Rubik, sans-serif',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }
                            } >
                            🗑️Excluir <
                            /button>
                        )
                    } <
                    /div> <
                    /div>
                ))
            )
        } <
        /div>

        {
            /* Paginação */ } {
            pages > 1 && ( <
                div className = {
                    styles.pagination
                } >
                <
                button onClick = {
                    () => handlePageChange(page - 1)
                }
                disabled = {
                    page <= 1
                }
                className = {
                    styles.pagination_button
                } >
                ←Anterior <
                /button>

                <
                span className = {
                    styles.pagination_info
                } >
                Página {
                    page
                }
                de {
                    pages
                } <
                /span>

                <
                button onClick = {
                    () => handlePageChange(page + 1)
                }
                disabled = {
                    page >= pages
                }
                className = {
                    styles.pagination_button
                } >
                Próxima→ <
                /button> <
                /div>
            )
        } <
        /section>
    );
}