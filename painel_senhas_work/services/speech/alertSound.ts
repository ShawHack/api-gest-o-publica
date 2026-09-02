/** Sinal sonoro sintetizado (dois tons) — não depende de arquivo externo. */
export function playAlertChime(volume = 1): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) {
        resolve()
        return
      }

      const ctx = new AudioCtx()
      const master = Math.min(1, Math.max(0, volume))
      const tones = [
        { freq: 880, start: 0, dur: 0.18, gain: 0.45 * master },
        { freq: 660, start: 0.2, dur: 0.28, gain: 0.35 * master },
      ]

      let ended = 0
      tones.forEach((tone) => {
        const osc = ctx.createOscillator()
        const env = ctx.createGain()
        const now = ctx.currentTime
        osc.type = 'sine'
        osc.frequency.setValueAtTime(tone.freq, now + tone.start)
        env.gain.setValueAtTime(0, now + tone.start)
        env.gain.linearRampToValueAtTime(tone.gain, now + tone.start + 0.02)
        env.gain.setValueAtTime(tone.gain, now + tone.start + tone.dur - 0.06)
        env.gain.linearRampToValueAtTime(0, now + tone.start + tone.dur)
        osc.connect(env)
        env.connect(ctx.destination)
        osc.start(now + tone.start)
        osc.stop(now + tone.start + tone.dur)
        osc.onended = () => {
          osc.disconnect()
          env.disconnect()
          ended += 1
          if (ended >= tones.length) {
            void ctx.close().finally(() => resolve())
          }
        }
      })
    } catch {
      resolve()
    }
  })
}
