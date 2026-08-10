import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Input from './input';
import Select from './Select';
import styles from './Form.module.css';

export default function UsuarioForm({
  handleSubmit,
  userData = {},
  btnText = 'Salvar',
  mode = 'edit',
  canEditRole = false,
  requirePassword = false,
  disabled = false,
}) {
  const [form, setForm] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    role: 'usuario',
    password: '',
    confirmpassword: '',
    image: null,
  });

  const [preview, setPreview] = useState(null);

  // 👁️ estados para mostrar/ocultar senhas
  const [showPass, setShowPass] = useState({ password: false, confirm: false });

  useEffect(() => {
    if (userData && userData._id) {
      setForm((prev) => ({
        ...prev,
        name: userData.name || '',
        cpf: userData.cpf || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || 'usuario',
      }));
      setPreview(
        userData.image
          ? `/images/users/${userData.image}`
          : null
      );
    }
  }, [userData]);

  function onChange(e) {
    const { name, value, files } = e.target;
    if (name === 'image') {
      const file = (files && files[0]) || null;
      setForm((f) => ({ ...f, image: file }));
      setPreview(file ? URL.createObjectURL(file) : null);
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  function submit(e) {
    e.preventDefault();

    if (requirePassword) {
      if (!form.password || !form.confirmpassword) {
        alert('Preencha a senha e a confirmação.');
        return;
      }
      if (form.password !== form.confirmpassword) {
        alert('As senhas não conferem.');
        return;
      }
    }

    const baseFields = ['name', 'cpf', 'email', 'phone', 'role'];

    if (form.image || requirePassword) {
      const fd = new FormData();
      baseFields.forEach((k) => {
        if (form[k] !== undefined && form[k] !== '') fd.append(k, form[k]);
      });
      if (requirePassword) {
        fd.append('password', form.password);
        fd.append('confirmpassword', form.confirmpassword);
      }
      if (form.image) fd.append('image', form.image);
      handleSubmit(fd, { isFormData: true });
    } else {
      const json = {};
      baseFields.forEach((k) => (json[k] = form[k]));
      handleSubmit(json, { isFormData: false });
    }
  }

  return (
    <section className={styles.form_container}>
      {/* Avatar no topo – linha inteira */}
      <div className={`${styles.full_row} ${styles.avatar_wrap}`}>
        {preview ? (
          <img className={styles.avatar} src={preview} alt={form.name || 'Usuário'} />
        ) : (
          <div className={styles.avatar} aria-label="Sem foto" />
        )}
      </div>

      <form onSubmit={submit} noValidate>
        {/* Input de imagem – linha inteira e centralizado */}
        <div className={`${styles.full_row} ${styles.centered_narrow}`}>
          <Input
            text="Foto (JPG/PNG)"
            type="file"
            name="image"
            handleOnChange={onChange}
            accept="image/*"
            disabled={disabled}
          />
        </div>

        {/* Linha 1: Nome | E-mail */}
        <Input
          text="Nome"
          name="name"
          type="text"
          value={form.name}
          handleOnChange={onChange}
          required
          disabled={disabled}
        />
        <Input
          text="E-mail"
          name="email"
          type="email"
          value={form.email}
          handleOnChange={onChange}
          required
          disabled={disabled}
        />

        {/* Linha 2: CPF | Telefone */}
        <Input
          text="CPF"
          name="cpf"
          type="text"
          value={form.cpf}
          handleOnChange={onChange}
          required
          disabled={disabled}
        />
        <Input
          text="Telefone"
          name="phone"
          type="text"
          value={form.phone}
          handleOnChange={onChange}
          required
          disabled={disabled}
        />

        {/* Linha 3: Papel (se aplicável) | (vazio ou próximo campo) */}
        {(canEditRole || mode === 'create') && (
          <Select
            name="role"
            text="Papel"
            options={[
              { value: 'usuario', label: 'usuario' },
              { value: 'concessionario', label: 'concessionario' },
              { value: 'admin', label: 'admin' },
              { value: 'iluminacao_admin', label: 'admin_iluminacao' },
              { value: 'sama', label: 'sama' },
              { value: 'admin_cultura', label: 'Admin Cultura (SECULT)' },
            ]}
            handleOnChange={onChange}
            value={form.role}
            disabled={disabled || !canEditRole}
          />
        )}
        {(canEditRole || mode === 'create') ? <div /> : null}

        {/* Senhas (somente create ou quando exigir) – cada uma ocupa uma coluna */}
        {requirePassword && (
          <>
            {/* Senha */}
            <div
              className={styles.form_control}
              style={{ position: 'relative' }}
            >
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type={showPass.password ? 'text' : 'password'}
                value={form.password}
                onChange={onChange}
                required
                disabled={disabled}
                className={styles.input}
                autoComplete="new-password"
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                aria-label={showPass.password ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() =>
                  setShowPass((s) => ({ ...s, password: !s.password }))
                }
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-10%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                {showPass.password ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Confirmar Senha */}
            <div
              className={styles.form_control}
              style={{ position: 'relative' }}
            >
              <label htmlFor="confirmpassword">Confirmar Senha</label>
              <input
                id="confirmpassword"
                name="confirmpassword"
                type={showPass.confirm ? 'text' : 'password'}
                value={form.confirmpassword}
                onChange={onChange}
                required
                disabled={disabled}
                className={styles.input}
                autoComplete="new-password"
                placeholder="Confirme sua senha"
              />
              <button
                type="button"
                aria-label={showPass.confirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                onClick={() =>
                  setShowPass((s) => ({ ...s, confirm: !s.confirm }))
                }
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-10%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                {showPass.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </>
        )}

        {/* Botão já ocupa as duas colunas pelo CSS */}
        <input type="submit" value={btnText} disabled={disabled} />
      </form>
    </section>
  );
}
