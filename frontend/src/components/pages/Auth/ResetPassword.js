// src/components/pages/auth/ResetPassword.js
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styles from '../../form/Form.module.css';
import Input from '../../form/input';
import api from '../../../utils/api';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ResetPassword() {
  const q = useQuery();
  const email = q.get('email') || '';
  const token = q.get('token') || '';

  const [novaSenha, setNovaSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!email || !token) setMsg('Link inválido.');
  }, [email, token]);

  async function submit(e) {
    e.preventDefault();
    if (novaSenha !== confirma) {
      setMsg('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/users/reset-password', { email, token, password: novaSenha, confirmpassword: confirma });
      setSuccess(true);
      setMsg(
        'Senha alterada com sucesso! Agora acesse o sistema desejado e realize o login com sua nova senha.'
      );
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Não foi possível alterar a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className={styles.form_container}
      style={{ maxWidth: 400, textAlign: 'center' }}
    >
      <h2>Redefinir senha</h2>
      {!success && (
        <form onSubmit={submit}>
          <Input
            text="Nova senha"
            type="password"
            name="novaSenha"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
          />
          <Input
            text="Confirmar senha"
            type="password"
            name="confirma"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            required
          />
          <input
            type="submit"
            value={loading ? 'Salvando...' : 'Salvar'}
            disabled={loading || !email || !token}
          />
        </form>
      )}
      {msg && (
        <p
          style={{
            marginTop: 16,
            color: success ? '#749666' : '#a02e2e', /* Identidade Visual Garça - Verde/Vermelho */
            fontWeight: 500,
          }}
        >
          {msg}
        </p>
      )}
    </section>
  );
}
