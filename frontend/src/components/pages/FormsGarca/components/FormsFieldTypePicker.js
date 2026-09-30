import React from 'react'
import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  Mail,
  Phone,
  CreditCard,
  List,
  Radio,
  CheckSquare,
  UploadCloud,
  FileText,
} from 'lucide-react'
import styles from './FormsFieldTypePicker.module.css'

export const FIELD_TYPE_CATEGORIES = [
  {
    id: 'basicos',
    label: 'Básicos',
    types: [
      { id: 'text', label: 'Texto curto', desc: 'Uma linha de resposta livre', icon: Type },
      { id: 'textarea', label: 'Texto longo', desc: 'Múltiplas linhas para detalhamento', icon: AlignLeft },
      { id: 'number', label: 'Número', desc: 'Valores numéricos, quantidades ou idades', icon: Hash },
      { id: 'date', label: 'Data', desc: 'Seleção de dia, mês e ano', icon: Calendar },
    ],
  },
  {
    id: 'contato',
    label: 'Contato',
    types: [
      { id: 'email', label: 'E-mail', desc: 'Endereço de e-mail com validação', icon: Mail },
      { id: 'phone', label: 'Telefone', desc: 'Celular ou telefone fixo com máscara DDD', icon: Phone },
      { id: 'cpf', label: 'CPF', desc: 'Cadastro de Pessoa Física formatado', icon: CreditCard },
    ],
  },
  {
    id: 'escolha',
    label: 'Escolha',
    types: [
      { id: 'select', label: 'Lista suspensa', desc: 'Menu dropdown para seleção única', icon: List },
      { id: 'radio', label: 'Escolha única', desc: 'Opções em botões radiais visíveis', icon: Radio },
      { id: 'checkbox', label: 'Múltipla escolha', desc: 'Caixas de seleção para múltiplas opções', icon: CheckSquare },
    ],
  },
  {
    id: 'outros',
    label: 'Outros',
    types: [
      { id: 'file', label: 'Upload de arquivo', desc: 'Envio de comprovante ou documento', icon: UploadCloud },
      { id: 'terms', label: 'Aceite de termos', desc: 'Concordância com termos ou regulamento', icon: FileText },
    ],
  },
]

export const FIELD_TYPE_LABELS = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  number: 'Número',
  date: 'Data',
  email: 'E-mail',
  phone: 'Telefone',
  cpf: 'CPF',
  select: 'Lista suspensa',
  radio: 'Escolha única',
  checkbox: 'Múltipla escolha',
  file: 'Upload de arquivo',
  terms: 'Aceite de termos',
}

export default function FormsFieldTypePicker({
  selectedType = 'text',
  onSelectType,
  compact = false,
}) {
  return (
    <div className={compact ? styles.compactContainer : styles.container}>
      {FIELD_TYPE_CATEGORIES.map((category) => (
        <div key={category.id} className={styles.categorySection}>
          <div className={styles.categoryTitle}>{category.label}</div>
          <div className={compact ? styles.compactGrid : styles.typeGrid}>
            {category.types.map((item) => {
              const IconComp = item.icon
              const isSelected = selectedType === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.typeCard} ${isSelected ? styles.typeCardSelected : ''}`}
                  onClick={() => onSelectType && onSelectType(item.id)}
                  aria-pressed={isSelected}
                  aria-label={`Tipo ${item.label}: ${item.desc}`}
                >
                  <div className={styles.iconWrapper}>
                    <IconComp size={compact ? 16 : 18} />
                  </div>
                  <div className={styles.textContent}>
                    <span className={styles.typeLabel}>{item.label}</span>
                    {!compact && <span className={styles.typeDesc}>{item.desc}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
