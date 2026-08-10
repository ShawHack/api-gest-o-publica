import api from '../../../utils/api';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './../Sepultado/Dashboard.module.css';
import useFlashMessage from '../../../hooks/useFlashMessage';

// 1. Importe o componente RoundedImage para padronizar o visual
import RoundedImage from '../../layout/RoundedImage';

const LIMIT = 20;

export default function MeusUsuarios() {
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [q, setQ] = useState('');
  const [stats, setStats] = useState({ total: 0, usuario: 0, concessionario: 0, admin: 0 });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const { setFlashMessage } = useFlashMessage();

  const readToken = useCallback(() => {
    const fromAuth = JSON.parse(localStorage.getItem('auth') || '{}')?.token;
    if (fromAuth) return fromAuth;
    const raw = localStorage.getItem('token');
    if (!raw) return '';
    try { return JSON.parse(raw) } catch { return raw.replace(/^"+|"+$/g, '') }
  }, []);
  const token = readToken();

  useEffect(() => {
    if (!token) return;

    api.get('/users/checkuser', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMe(res.data))
      .catch(() => setFlashMessage('Falha ao checar usuário.', 'error'));
  }, [token, setFlashMessage]);

  const fetchList = useCallback(async (query, pageNum = 1) => {
    try {
      const res = await api.get(`/users?q=${encodeURIComponent(query)}&page=${pageNum}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const list = res.data?.users || [];
      setUsers(list);
      setPage(res.data?.page || pageNum);
      setPages(res.data?.pages || 1);

      // Preenche contadores vindos do backend (roleCounts) — filtrados por q
      if (res.data?.roleCounts) {
        const { total = 0, usuario = 0, concessionario = 0, admin = 0 } = res.data.roleCounts || {};
        setStats({ total, usuario, concessionario, admin });
      } else {
        // Fallback: calcula com base no que foi recebido (pode ser parcial por paginação)
        const by = (arr, r) => arr.filter(u => u.role === r).length;
        setStats({
          total: res.data?.total ?? list.length,
          usuario: by(list, 'usuario'),
          concessionario: by(list, 'concessionario'),
          admin: by(list, 'admin'),
        });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao carregar usuários';
      setFlashMessage(msg, 'error');
    }
  }, [token, setFlashMessage]);

  useEffect(() => {
    if (!me) return;

    if (me.role === 'admin') {
      fetchList('', 1);
    } else {
      const self = {
        _id: me._id, name: me.name, email: me.email, role: me.role, image: me.image, phone: me.phone
      };
      setUsers([self]);
      setPage(1);
      setPages(1);
      // Não exibimos stats para não-admin, então não é necessário atualizar aqui.
    }
  }, [me, fetchList]);

  async function removeUser(id) {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      const res = await api.delete(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(prev => prev.filter(u => u._id !== id));
      setFlashMessage(res.data?.message || 'Excluído com sucesso!', 'success');

      // Atualiza os totais no admin após exclusão (mantém coerência do painel)
      if (me?.role === 'admin') {
        fetchList(q || '', page);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao excluir';
      setFlashMessage(msg, 'error');
    }
  }

  const isAdmin = me?.role === 'admin';
  const canAdd = isAdmin;

  function onSubmitFilter(e) {
    e.preventDefault();
    if (isAdmin) {
      setPage(1);
      fetchList(q, 1);
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pages && isAdmin) {
      fetchList(q, newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <section>
      <h2>Gerenciamento de Usuários</h2>

      {/* Resumo de totais — apenas admin */}
      {isAdmin && (
        <div className={styles.seplist_header} style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className={styles.helptext} style={{ background: '#eef5ff', padding: '8px 12px', borderRadius: 6 }}>
            <strong>Total de usuários:</strong> {stats.total}
          </div>
          <div className={styles.helptext} style={{ background: '#f4f4f5', padding: '8px 12px', borderRadius: 6 }}>
            <strong>Usuários – usuario:</strong> {stats.usuario}
          </div>
          <div className={styles.helptext} style={{ background: '#f4f4f5', padding: '8px 12px', borderRadius: 6 }}>
            <strong>Usuários – concessionario:</strong> {stats.concessionario}
          </div>
          <div className={styles.helptext} style={{ background: '#f4f4f5', padding: '8px 12px', borderRadius: 6 }}>
            <strong>Usuários – admin:</strong> {stats.admin}
          </div>
        </div>
      )}

      <div className={styles.seplist_header}>
        {canAdd ? (
          <Link to="/usuarios/add">Adicionar Usuário</Link>
        ) : (
          <span className={styles.helptext}>Você pode editar apenas o seu próprio perfil.</span>
        )}
      </div>

      {isAdmin && (
        <form onSubmit={onSubmitFilter} className={styles.filter_bar}>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className={styles.filter_input}
          />
          <button type="submit" className={styles.filter_button}>Pesquisar</button>
          {q && (
            <button
              type="button"
              className={styles.filter_button}
              onClick={() => { setQ(''); setPage(1); fetchList('', 1); }}
            >
              Limpar
            </button>
          )}
        </form>
      )}

      <div className={styles.seplist_container}>
        {users.map((user) => {
          // --- INÍCIO DA NOSSA LÓGICA DE IMAGEM PADRONIZADA ---
          const API = (process.env.REACT_APP_API || '').replace(/\/+$/, '');

          // O campo de imagem para usuário é 'image' (singular)
          const raw = user?.image;
          const cleaned = typeof raw === 'string' ? raw.trim() : '';
          const isBad = !cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '/';

          // A URL final, usando o fallback local para 'usuario-padrao.jpg'
          const srcImg = !isBad
            ? `${API}/images/users/${cleaned}`
            : '/usuario-padrao.jpg';
          // --- FIM DA LÓGICA ---

          return (
            <div className={styles.seplist_row} key={user._id}>
              {/* 2. Usando o componente RoundedImage */}
              <RoundedImage
                src={srcImg}
                alt={user.name}
                width="px75" // Usando uma classe de tamanho padrão do componente
              />
              <span className="bold" style={{ minWidth: 160, marginLeft: '12px' }}>{user.name}</span>
              <span style={{ minWidth: 220 }}>{user.email}</span>
              <span style={{ minWidth: 140, opacity: .8 }}>{user.role}</span>

              <div className={styles.actions}>
                {(isAdmin || me?._id === user._id) && (
                  <Link to={`/usuarios/edit/${user._id}`}>Editar</Link>
                )}
                {isAdmin && me?._id !== user._id && (
                  <button onClick={() => removeUser(user._id)}>Excluir</button>
                )}
              </div>
            </div>
          )
        })}

        {users.length === 0 && (
          <div className={styles.empty_state}>Nenhum usuário encontrado.</div>
        )}
      </div>

      {/* Controles de paginação - apenas para admin */}
      {isAdmin && pages > 1 && (
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
    </section>
  );
}
