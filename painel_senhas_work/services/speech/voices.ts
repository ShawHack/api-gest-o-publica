/** Preset: feminina pt-BR (Francisca, Maria, etc.) — estilo Mangati/aeroporto. */
export const SPEECH_VOICE_AUTO_FEMALE = 'auto-female'

/** Preset: primeira voz pt-BR disponível. */
export const SPEECH_VOICE_AUTO = 'auto'

export type SpeechVoiceOption = {
  value: string
  label: string
}

const FEMALE_HINTS =
  /francisca|maria|luciana|feminina|female|mulher|heloisa|heloísa|vitória|vitoria|camila|gabriela/i
const MALE_HINTS = /daniel|male|masculin|homem|\bman\b|david|antonio|antônio|jorge|tiago/i

function normalizeLang(lang: string): string {
  return lang.replace('_', '-').toLowerCase()
}

export function listBrowserVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices()
}

export function scoreFemaleVoice(voice: SpeechSynthesisVoice): number {
  const hint = `${voice.name} ${voice.voiceURI}`.toLowerCase()
  if (FEMALE_HINTS.test(hint)) return 20
  if (MALE_HINTS.test(hint)) return -20
  if (hint.includes('google') && hint.includes('portugu')) return 8
  if (hint.includes('microsoft') && hint.includes('pt-br')) return 6
  if (normalizeLang(voice.lang).startsWith('pt-br')) return 2
  if (normalizeLang(voice.lang).startsWith('pt')) return 1
  return 0
}

function ptBrVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((v) => normalizeLang(v.lang).startsWith('pt'))
}

export function pickFemalePtBrVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const pt = ptBrVoices(voices)
  if (!pt.length) return null
  return [...pt].sort((a, b) => scoreFemaleVoice(b) - scoreFemaleVoice(a))[0] ?? null
}

export function pickDefaultPtBrVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const pt = ptBrVoices(voices)
  if (!pt.length) return null
  return (
    pt.find((v) => normalizeLang(v.lang) === 'pt-br') ||
    pt.find((v) => normalizeLang(v.lang).startsWith('pt-br')) ||
    pt[0] ||
    null
  )
}

/** Resolve preset ou URI gravada para voz do navegador. */
export function resolveSpeechVoice(preference?: string | null): SpeechSynthesisVoice | null {
  const voices = listBrowserVoices()
  if (!voices.length) return null

  const pref = (preference || SPEECH_VOICE_AUTO_FEMALE).trim()
  if (!pref || pref === SPEECH_VOICE_AUTO_FEMALE) {
    return pickFemalePtBrVoice(voices) || pickDefaultPtBrVoice(voices)
  }
  if (pref === SPEECH_VOICE_AUTO) {
    return pickDefaultPtBrVoice(voices)
  }

  return (
    voices.find((v) => v.voiceURI === pref) ||
    voices.find((v) => v.name === pref) ||
    pickFemalePtBrVoice(voices) ||
    pickDefaultPtBrVoice(voices)
  )
}

/** Opções para o select de configuração (carregar após gesto do usuário na TV). */
export function buildSpeechVoiceOptions(voices: SpeechSynthesisVoice[]): SpeechVoiceOption[] {
  const pt = ptBrVoices(voices)
  const sorted = [...pt].sort((a, b) => scoreFemaleVoice(b) - scoreFemaleVoice(a))

  const options: SpeechVoiceOption[] = [
    {
      value: SPEECH_VOICE_AUTO_FEMALE,
      label: 'Feminina pt-BR (automática — estilo aeroporto)',
    },
    { value: SPEECH_VOICE_AUTO, label: 'Qualquer voz pt-BR (automática)' },
  ]

  for (const voice of sorted) {
    const tag = scoreFemaleVoice(voice) >= 8 ? ' ★' : ''
    options.push({
      value: voice.voiceURI,
      label: `${voice.name}${tag} (${voice.lang})`,
    })
  }

  return options
}
