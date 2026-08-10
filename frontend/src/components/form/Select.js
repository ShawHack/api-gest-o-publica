
import styles from './Form.module.css';

function Select({ name, text, options = [], handleOnChange, value, className = '' }) {
  const normalizeOption = (opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return {
      value: opt?.value ?? '',
      label: opt?.label ?? String(opt?.value ?? ''),
    };
  };

  return (
    <div className={styles.form_control}>
      <label htmlFor={name}>{text}</label>
      <select
        id={name}
        name={name}
        onChange={handleOnChange}
        value={value}
        className={`${styles.input} ${className}`}
      >
        <option value="">Selecione...</option>
        {options.map((opt) => {
          const parsed = normalizeOption(opt);
          return (
            <option key={parsed.value} value={parsed.value}>
              {parsed.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export default Select;