// components/pages/Auth/VerifyEmail.js
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from '../../form/Form.module.css';
import api from '../../../utils/api';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function VerifyEmail() {
  const q = useQuery();
  const token = q.get('token');
  const email = q.get('email');

  const [msg, setMsg] = useState('Validando seu e-mail...');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      if (!token || !email) {
        setMsg('Link inválido ou expirado.');
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/users/verify-email', {
          params: { token, email },
        });
        setMsg(
          data?.message ||
            'E-mail verificado com sucesso! Agora você pode acessar o sistema desejado e realizar o login.'
        );
        setSuccess(true);
        
        // Remove a flag de validação pendente
        localStorage.removeItem('emailValidationPending');
      } catch (err) {
        const errorMsg =
          err?.response?.data?.message || 'Não foi possível verificar o e-mail.';
        setMsg(errorMsg);
        setSuccess(false);
      } finally {
        setLoading(false);
      }
    }

    run();
  }, [token, email]);

  return (
    <section
      className={styles.form_container}
      style={{
        maxWidth: 450,
        textAlign: 'center',
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        fontFamily: 'var(--fonte-principal)',
      }}
    >
      <h2 style={{ 
        color: 'var(--cor-primaria)', 
        fontFamily: 'var(--fonte-principal)',
        fontSize: '2rem',
        marginBottom: '24px'
      }}>
        Verificação de E-mail
      </h2>

      <p
        style={{
          marginTop: 20,
          color: success ? 'var(--cor-verde)' : 'var(--cor-vermelho)', /* Identidade Visual Garça */
          fontWeight: 500,
          fontFamily: 'var(--fonte-principal)',
          fontSize: '1.1rem',
          lineHeight: '1.5',
        }}
      >
        {loading ? 'Validando...' : msg}
      </p>

      {!loading && success && (
        <div style={{ marginTop: 20 }}>
          <p style={{ 
            color: 'var(--cor-texto)', 
            marginBottom: 15,
            fontFamily: 'var(--fonte-principal)',
            fontSize: '1rem'
          }}>
            ✅ Sua conta foi ativada com sucesso!
          </p>
          <p style={{ 
            color: 'var(--cor-texto)', 
            marginBottom: 20,
            fontFamily: 'var(--fonte-principal)',
            fontSize: '0.95rem',
            opacity: 0.85
          }}>
            Você já pode fechar esta página e fazer login no aplicativo ou sistema onde se cadastrou.
          </p>
          <div style={{
            background: 'var(--cor-fundo-secundario, #f5f5f5)',
            padding: '15px 20px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: 'var(--cor-texto)',
            fontFamily: 'var(--fonte-principal)',
          }}>
            <strong>💡 SEMIT - </strong> Secretaria de Inovação e Tecnologia
          </div>
        </div>
      )}

      {!loading && !success && (
        <div style={{ marginTop: 20 }}>
          <p style={{ 
            color: 'var(--cor-texto)', 
            marginBottom: 15,
            fontFamily: 'var(--fonte-principal)',
            fontSize: '1rem'
          }}>
            ⚠️ Não foi possível validar seu e-mail.
          </p>
          <div style={{
            background: 'var(--cor-fundo-secundario, #f5f5f5)',
            padding: '15px 20px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: 'var(--cor-texto)',
            fontFamily: 'var(--fonte-principal)',
            textAlign: 'left'
          }}>
            <p style={{ marginBottom: 10 }}><strong>Possíveis causas:</strong></p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>O link expirou (válido por 24h)</li>
              <li>O e-mail já foi verificado anteriormente</li>
              <li>O link foi copiado incorretamente</li>
            </ul>
            <p style={{ marginTop: 15, marginBottom: 0 }}>
              <strong>💡 Solução:</strong> Volte ao aplicativo onde se cadastrou e solicite um novo link de verificação na tela de login.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
