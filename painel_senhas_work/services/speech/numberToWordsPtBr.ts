const UNITS = [
  '',
  'um',
  'dois',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
]

const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const HUNDREDS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
]

function underThousand(n: number): string {
  if (n === 0) return 'zero'
  if (n === 100) return 'cem'
  if (n < 20) return UNITS[n]

  if (n < 100) {
    const ten = Math.floor(n / 10)
    const unit = n % 10
    return unit === 0 ? TENS[ten] : `${TENS[ten]} e ${UNITS[unit]}`
  }

  const hundred = Math.floor(n / 100)
  const rest = n % 100
  if (rest === 0) return HUNDREDS[hundred]
  return `${HUNDREDS[hundred]} e ${underThousand(rest)}`
}

/** Converte inteiro 0–9999 para extenso pt-BR. */
export function numberToWordsPtBr(value: number): string {
  const n = Math.trunc(Math.abs(value))
  if (n < 1000) return underThousand(n)

  const thousand = Math.floor(n / 1000)
  const rest = n % 1000
  const thousandPart = thousand === 1 ? 'mil' : `${underThousand(thousand)} mil`
  if (rest === 0) return thousandPart
  return `${thousandPart} e ${underThousand(rest)}`
}

export function spellPrefix(prefix: string): string {
  const trimmed = prefix.trim()
  if (!trimmed) return ''
  if (trimmed.length === 1) {
    return trimmed.toUpperCase()
  }
  return trimmed.split('').join(' ')
}
