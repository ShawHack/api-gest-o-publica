import { resolveSpeechVoice } from './voices'

export type SpeechJob = {
  id: string
  /** Texto único (legado). */
  text?: string
  /** Segmentos falados em sequência — estilo Mangati. */
  parts?: string[]
  lang?: string
  volume?: number
  rate?: number
  /** Preset (`auto-female`) ou voiceURI do navegador. */
  voicePreference?: string
  playAlertFirst?: boolean
}

type QueueOptions = {
  playAlert?: (volume: number) => Promise<void>
}

function normalizeLang(lang?: string): string {
  return (lang || 'pt-BR').replace('_', '-').toLowerCase()
}

/** Sigla soletrada em um único trecho, ex.: "P R O" ou "A". */
function isSpelledSigla(text: string): boolean {
  return /^[A-Za-z](?:\s[A-Za-z])*$/.test(text.trim())
}

const SIGLA_RATE_BOOST = 1.25

/**
 * Fila serial de síntese de voz — impede sobreposição (como o Mangati).
 */
export class SpeechQueue {
  private queue: SpeechJob[] = []
  private running = false
  private unlocked = false
  private readonly options: QueueOptions
  private readonly speakImpl: (job: SpeechJob) => Promise<void>

  constructor(
    options: QueueOptions = {},
    speakImpl?: (job: SpeechJob) => Promise<void>,
  ) {
    this.options = options
    this.speakImpl = speakImpl ?? ((job) => this.defaultSpeak(job))
  }

  markUnlocked(): void {
    this.unlocked = true
    // Chrome carrega vozes de forma assíncrona; força refresh após gesto do usuário.
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
    }
  }

  isUnlocked(): boolean {
    return this.unlocked
  }

  enqueue(job: SpeechJob): void {
    this.queue.push(job)
    void this.pump()
  }

  clear(): void {
    this.queue = []
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  get pending(): number {
    return this.queue.length
  }

  get isBusy(): boolean {
    return this.running
  }

  private async pump(): Promise<void> {
    if (this.running) return
    this.running = true

    while (this.queue.length > 0) {
      const job = this.queue.shift()
      if (!job) break
      try {
        if (job.playAlertFirst && this.options.playAlert) {
          await this.options.playAlert(job.volume ?? 1)
        }
        await this.speakImpl(job)
      } catch {
        // Continua a fila mesmo se um item falhar
      }
    }

    this.running = false
  }

  private async defaultSpeak(job: SpeechJob): Promise<void> {
    const parts =
      job.parts && job.parts.length > 0
        ? job.parts
        : job.text
          ? [job.text]
          : []

    for (const part of parts) {
      await this.speakOne(part, job)
    }
  }

  private speakOne(text: string, job: SpeechJob): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve()
        return
      }

      const baseRate = Math.min(2, Math.max(0.5, job.rate ?? 1))
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = normalizeLang(job.lang)
      utterance.volume = Math.min(1, Math.max(0, job.volume ?? 1))
      utterance.rate = isSpelledSigla(text)
        ? Math.min(2, baseRate * SIGLA_RATE_BOOST)
        : baseRate

      const voice = resolveSpeechVoice(job.voicePreference)
      if (voice) utterance.voice = voice

      utterance.onend = () => resolve()
      utterance.onerror = () => reject(new Error('speech error'))
      window.speechSynthesis.speak(utterance)
    })
  }
}
