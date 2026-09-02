import { useEffect, useState } from 'react'
import { buildSpeechVoiceOptions, listBrowserVoices, type SpeechVoiceOption } from '../services/speech/voices'

export function useSpeechVoices(enabled = true): SpeechVoiceOption[] {
  const [options, setOptions] = useState<SpeechVoiceOption[]>(() =>
    enabled ? buildSpeechVoiceOptions(listBrowserVoices()) : [],
  )

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const refresh = () => setOptions(buildSpeechVoiceOptions(listBrowserVoices()))

    refresh()
    window.speechSynthesis.getVoices()
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
  }, [enabled])

  return options
}
