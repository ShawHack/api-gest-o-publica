// imports atuais...
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import UsuarioForm from '../../form/UsuarioForm';
import useFlashMessage from '../../../hooks/useFlashMessage';

export default function EditUsuario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setFlashMessage } = useFlashMessage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState('usuario');
  const [newRole, setNewRole] = useState('usuario');
  const [initialCulturaAdmin, setInitialCulturaAdmin] = useState(false);
  const [culturaAssignmentId, setCulturaAssignmentId] = useState(null);

  const readToken = useCallback(() => {
    const fromAuth = JSON.parse(localStorage.getItem('auth') || '{}')?.token;
    if (fromAuth) return fromAuth;
    const raw = localStorage.getItem('token');
    if (!raw) return '';
    try { return JSON.parse(raw) } catch { return raw.replace(/^"+|"+$/g, '') }
  }, []);
  const token = readToken();

  useEffect(() => {
    // quem sou eu (para saber se sou admin)
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    if (auth?.role) setMyRole(auth.role);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setFlashMessage('Você precisa estar logado para editar usuários.', 'error');
      navigate('/');
      return;
    }

    setLoading(true);
    api.get(`/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        // A API pode retornar: { user }, { currentUser }, ou o objeto direto
        const userData = res.data?.user || res.data?.currentUser || res.data;

        if (!userData || !userData._id) {
          setFlashMessage('Usuário não encontrado.', 'error');
          navigate('/meuusuario');
          return;
        }

        setUser(userData);

        const loadRole = async () => {
          const auth = JSON.parse(localStorage.getItem('auth') || '{}');
          const isAdmin = auth?.role === 'admin';
          if (isAdmin) {
            try {
              const ar = await api.get(`/cultura/admin/assignments?userId=${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const items = ar.data?.data || [];
              const culturaAssign = items.find(
                (a) => a.role === 'admin_cultura' && a.isActive !== false
              );
              if (culturaAssign) {
                setCulturaAssignmentId(culturaAssign._id);
                setInitialCulturaAdmin(true);
                setNewRole('admin_cultura');
                return;
              }
            } catch {
              /* módulo cultura indisponível — mantém role global */
            }
          }
          setNewRole(userData?.role || 'usuario');
        };

        loadRole();
      })
      .catch((err) => {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || 'Erro ao carregar usuário.';

        if (status === 401) {
          setFlashMessage('Sessão expirada. Faça login novamente.', 'error');
          navigate('/login');
        } else if (status === 403) {
          setFlashMessage('Você não tem permissão para editar este usuário.', 'error');
          navigate('/meuusuario');
        } else if (status === 404) {
          setFlashMessage('Usuário não encontrado.', 'error');
          navigate('/meuusuario');
        } else {
          setFlashMessage(msg, 'error');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, token, navigate, setFlashMessage]);

  const updateUser = useCallback(async (payload, { isFormData }) => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      };
      const res = await api.patch(`/users/${id}`, payload, { headers });
      setFlashMessage(res.data?.message || 'Perfil atualizado!', 'success');

      if (myRole === 'admin') {
        const culturaSelected = newRole === 'admin_cultura';
        const authHeaders = { Authorization: `Bearer ${token}` };

        if (culturaSelected && !initialCulturaAdmin) {
          await api.post(
            '/cultura/admin/assignments',
            { userId: id, role: 'admin_cultura' },
            { headers: authHeaders }
          );
        } else if (!culturaSelected && initialCulturaAdmin && culturaAssignmentId) {
          await api.delete(`/cultura/admin/assignments/${culturaAssignmentId}`, {
            headers: authHeaders,
          });
        }

        if (!culturaSelected && newRole && newRole !== user.role) {
          await api.patch(`/users/${id}/role`, { role: newRole }, { headers: authHeaders });
        }

        setFlashMessage('Papel e permissões atualizados com sucesso!', 'success');
      }

      navigate('/meuusuario');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao atualizar usuário';
      setFlashMessage(msg, 'error');
    }
  }, [id, token, myRole, newRole, user, navigate, setFlashMessage, initialCulturaAdmin, culturaAssignmentId]);

  if (loading) {
    return (
      <section>
        <h2>Editar Usuário</h2>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Carregando dados do usuário...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section>
        <h2>Editar Usuário</h2>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Não foi possível carregar os dados do usuário.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2>Editar Usuário</h2>

      {/* Formulário de dados básicos (nome, email, foto) */}
      <UsuarioForm
        handleSubmit={updateUser}
        userData={user}
        btnText="Salvar"
        mode="edit"
        canEditRole={false}      // role será trocado no painel abaixo
        requirePassword={false}
      />

      {/* Painel de papel — somente para admin */}
      {myRole === 'admin' && (
        <div style={{ marginTop: 24, padding: 16, border: '2px solid #364ba3', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0, color: '#364ba3' }}>Papel do Usuário</h3>
          <label style={{ marginRight: 8 }}>Selecionar papel:</label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            style={{ padding: 6, borderRadius: 6, border: '1px solid #ccc' }}
          >
            <option value="usuario">Usuário</option>
            <option value="concessionario">Concessionário</option>
            <option value="iluminacao_admin">admin_iluminacao</option>
            <option value="sama">SAMA (cadastro de árvores)</option>
            <option value="admin_cultura">Admin Cultura (SECULT)</option>
            <option value="admin">Admin</option>
          </select>

          <p style={{ marginTop: 8, fontSize: 12, opacity: .8 }}>
            <strong>Admin Cultura</strong> concede acesso ao painel do portal cultural (/cultura/admin).
            O papel global do usuário permanece como cidadão; a permissão é gerenciada pelo módulo Cultura.
            Use com cautela. Você não pode remover o próprio papel de admin global.
          </p>
        </div>
      )}
    </section>
  );
}
