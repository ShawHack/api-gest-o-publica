// src/components/pages/Usuario/AddUsuario.js
import styles from './../Sepultado/AddSepultado.module.css';
import api from '../../../utils/api';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UsuarioForm from '../../form/UsuarioForm';
import useFlashMessage from '../../../hooks/useFlashMessage';

export default function AddUsuario() {
  const navigate = useNavigate();
  const { setFlashMessage } = useFlashMessage();
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => localStorage.getItem('token') || '', []);
  const role  = useMemo(() => {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    return auth.role || localStorage.getItem('role') || 'usuario';
  }, []);

  async function createUser(payload) {
    // Bloqueio na UI (o backend também valida)
    if (role !== 'admin') {
      setFlashMessage('Acesso restrito: somente administradores podem criar usuários.', 'error');
      return;
    }
    if (!token) {
      setFlashMessage('Você precisa estar logado para criar usuários.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(
        '/users/admin-create',
        payload, // deve conter name, cpf, email, phone, role, password, confirmpassword
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      const msg = res?.data?.message || 'Usuário criado!';
      setFlashMessage(msg, 'success');
      navigate('/meuusuario');
    } catch (err) {
      const data = err?.response?.data;
      const status = err?.response?.status;

      let msg =
        data?.message ||
        (Array.isArray(data?.errors) && data.errors.map(e => e.msg).join('\n')) ||
        (Array.isArray(data?.details) && data.details.map(d => d.message || d).join('\n')) ||
        err?.message ||
        'Erro ao criar usuário';

      if (status === 401) msg = 'Sessão expirada ou inválida. Entre novamente.';
      if (status === 403) msg = 'Sem permissão para criar usuários.';
      if (status === 409) msg = 'E-mail ou CPF já cadastrado.';
      if (status === 422 && Array.isArray(data?.details) && data.details.length) {
        msg = data.details.join('\n');
      }

      setFlashMessage(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.addsep_header}>
      <div>
        <h2>Novo Usuário</h2>
        <p>Crie um usuário do sistema. Apenas administradores têm acesso.</p>
      </div>

      <UsuarioForm
        handleSubmit={createUser}
        btnText={loading ? 'Cadastrando...' : 'Cadastrar'}
        mode="create"
        canEditRole
        requirePassword
        requireCpf
        disabled={loading}
      />
    </section>
  );
}
