import { useState, useContext, useEffect } from "react";
import { Eye, EyeOff } from 'lucide-react';
import Input from '../../form/input';
import styles from '../../form/Form.module.css';
import { Link } from 'react-router-dom';

// context
import { Context } from "../../../context/UserContext";

function LoginMonitoramento() {
    const [user, setUser] = useState({ email: '', password: '' });
    const [showPass, setShowPass] = useState(false); // 👁️
    const [showEmailValidationMessage, setShowEmailValidationMessage] = useState(false);
    const { login } = useContext(Context);

    // Verifica se deve mostrar a mensagem de validação de email
    useEffect(() => {
        const pendingValidation = localStorage.getItem('emailValidationPending');
        if (pendingValidation === 'true') {
            setShowEmailValidationMessage(true);
        }
    }, []);

    function handleChange(e) {
        setUser(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        // Redireciona para /shift-handovers após login
        login(user, '/shift-handovers');
    }

    return (
        <section className={styles.form_container} style={{ borderTop: '5px solid #6b46c1' }}>
            {/* Mensagem persistente de validação de email */}
            {showEmailValidationMessage && (
                <div className={styles.validation_message}>
                    <h3>📧 Validação de Email Necessária</h3>
                    <p>
                        <strong>Para realizar login, vá no seu email e clique no link de validação que enviamos.</strong>
                    </p>
                    <p>
                        Verifique sua caixa de entrada e também a pasta de spam/lixo eletrônico.
                    </p>
                    <button
                        type="button"
                        className={styles.dismiss_button}
                        onClick={() => {
                            setShowEmailValidationMessage(false);
                            localStorage.removeItem('emailValidationPending');
                        }}
                    >
                        ✓ Já validei meu email
                    </button>
                </div>
            )}

            <h2>Login - Monitoramento Semit</h2>

            <form onSubmit={handleSubmit} noValidate>
                {/* E-mail */}
                <Input
                    text="E-mail"
                    type="email"
                    name="email"
                    placeholder="Digite o seu e-mail"
                    handleOnChange={handleChange}
                    value={user.email}
                    autoComplete="email"
                />

                {/* Senha (com olhinho) */}
                <div className={`${styles.form_control} ${styles.password_wrap}`}>
                    <label htmlFor="password">Senha</label>
                    <input
                        id="password"
                        name="password"
                        type={showPass ? 'text' : 'password'}
                        value={user.password}
                        onChange={handleChange}
                        placeholder="Digite sua senha"
                        className={`${styles.input} ${styles.password_input}`}
                        autoComplete="current-password"
                        required
                    />
                    <button
                        type="button"
                        className={styles.toggle_eye}
                        aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                        onClick={() => setShowPass(v => !v)}
                    >
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                <input type="submit" value="Acessar Monitoramento" />
            </form>

            {/* Links opcionais - mantidos mas podem ser removidos se o usuário quiser isolamento total */}
            {/* <div className={styles.form_links}>
        <p>
          <Link to="/auth/forgot-password">Esqueci a senha</Link>
        </p>
      </div> */}
        </section>
    );
}

export default LoginMonitoramento;
