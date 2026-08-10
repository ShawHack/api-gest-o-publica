// src/components/pages/auth/ForgotPassword.js
import { useState } from 'react';
import styles from '../../form/Form.module.css';
import Input from '../../form/input';
import api from '../../../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/users/forgot-password', { email });
      setMsg('Se o e-mail existir, enviaremos instruções para recuperação.');
    } catch (e) {
      setMsg('Se o e-mail existir, enviaremos instruções para recuperação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.form_container}>
      <h2>Recuperar senha</h2>
      <form onSubmit={submit}>
        <Input
          text="E-mail"
          name="email"
          type="email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          required
        />
        <input type="submit" value={loading ? 'Enviando...' : 'Enviar'} disabled={loading} />
      </form>
      {msg && <p style={{marginTop: 12}}>{msg}</p>}
    </section>
  );
}
