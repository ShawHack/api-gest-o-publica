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
        setNewRole(userData?.role || 'usuario');
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

      // Se o admin alterou o papel, chama o endpoint dedicado
      if (myRole === 'admin' && newRole && newRole !== user.role) {
        await api.patch(`/users/${id}/role`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } });
        setFlashMessage('Papel atualizado com sucesso!', 'success');
      }

      navigate('/meuusuario');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao atualizar usuário';
      setFlashMessage(msg, 'error');
    }
  }, [id, token, myRole, newRole, user, navigate, setFlashMessage]);

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
        <div style={{ marginTop: 24, padding: 16, border: '2px solid #075b76', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0, color: '#075b76' }}>Papel do Usuário</h3>
          <label style={{ marginRight: 8 }}>Selecionar papel:</label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            style={{ padding: 6, borderRadius: 6, border: '1px solid #ccc' }}
          >
            <option value="usuario">Usuário</option>
            <option value="concessionario">Concessionário</option>
            <option value="admin">Admin</option>
          </select>

          <p style={{ marginTop: 8, fontSize: 12, opacity: .8 }}>
            Dica: use com cautela. Você não pode remover o próprio papel de admin.
          </p>
        </div>
      )}
    </section>
  );
}
