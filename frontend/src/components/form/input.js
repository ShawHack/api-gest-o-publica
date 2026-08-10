// Input.jsx
import styles from './Form.module.css'   // <- usa o mesmo CSS dos formulários

function Input({
  type = 'text',
  text,
  name,
  placeholder,
  handleOnChange,
  value,
  multiple,
  className = '',       // <- permite passar styles.inputError
  id,
  ...rest
}) {
  const inputId = id || name

  if (type === 'textarea') {
    return (
      <div className={styles.form_control}>
        {text && <label htmlFor={inputId}>{text}</label>}
        <textarea
          id={inputId}
          name={name}
          placeholder={placeholder}
          onChange={handleOnChange}
          value={value ?? ''}
          className={`${styles.input} ${className}`}   // <- mesmo visual dos inputs
          rows={4}
          {...rest}
        />
      </div>
    )
  }

  // props para file vs. demais tipos (não setar 'value' em file)
  const inputProps =
    type === 'file'
      ? {
          type,
          name,
          id: inputId,
          placeholder,
          onChange: handleOnChange,
          ...(multiple ? { multiple: true } : {}),
          className: `${styles.input} ${className}`,   // <- aplica visual + erro
          ...rest,
        }
      : {
          type,
          name,
          id: inputId,
          placeholder,
          onChange: handleOnChange,
          value: value ?? '',
          ...(multiple ? { multiple: true } : {}),
          className: `${styles.input} ${className}`,   // <- aplica visual + erro
          ...rest,
        }

  return (
    <div className={styles.form_control}>
      {text && <label htmlFor={inputId}>{text}</label>}
      <input {...inputProps} />
    </div>
  )
}

export default Input
