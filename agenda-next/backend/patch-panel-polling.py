#!/usr/bin/env python3
"""Ativa polling em paralelo ao Mercure + SSE da Agenda + onWake direto."""
from pathlib import Path

cm = Path('/home/semit/painel-semit/src/services/realtime/connectionManager.ts')
ctx = Path('/home/semit/painel-semit/src/features/calls/PanelContext.tsx')

cm_text = cm.read_text(encoding='utf-8')

if 'backgroundPollTimer' not in cm_text:
    cm_text = cm_text.replace(
        '  private pollTimer: ReturnType<typeof setInterval> | null = null\n'
        '  private sseRetryFromPollTimer',
        '  private pollTimer: ReturnType<typeof setInterval> | null = null\n'
        '  private backgroundPollTimer: ReturnType<typeof setInterval> | null = null\n'
        '  private sseRetryFromPollTimer',
    )
    cm_text = cm_text.replace(
        '    this.disposed = false\n    this.connectSse()\n  }',
        '    this.disposed = false\n    this.startBackgroundPolling()\n    this.connectSse()\n  }',
    )
    cm_text = cm_text.replace(
        '    this.clearTimers()\n    this.mercure?.disconnect()\n    this.mercure = null\n'
        '    this.mode = \'idle\'\n  }',
        '    this.clearTimers()\n    this.clearBackgroundPolling()\n    this.mercure?.disconnect()\n'
        '    this.mercure = null\n    this.mode = \'idle\'\n  }',
    )
    cm_text = cm_text.replace(
        "          this.options.onStatus('connected')\n          return",
        "          this.options.onStatus('connected')\n          this.startBackgroundPolling()\n          return",
    )
    insert = """
  private startBackgroundPolling(): void {
    this.clearBackgroundPolling()
    this.options.onPollTick()
    this.backgroundPollTimer = setInterval(
      () => this.options.onPollTick(),
      this.options.pollIntervalMs,
    )
  }

  private clearBackgroundPolling(): void {
    if (this.backgroundPollTimer) {
      clearInterval(this.backgroundPollTimer)
      this.backgroundPollTimer = null
    }
  }

  private startPolling(): void {"""
    cm_text = cm_text.replace('  private startPolling(): void {', insert)

if "agenda/public/panels/events" not in cm_text:
    cm_text = cm_text.replace(
        '    this.mercure.connect()\n  }',
        """    this.mercure.connect()

    try {
      if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
        const pathMatch = window.location.pathname.match(/\\/p\\/([^/?#]+)/)
        const slug = pathMatch?.[1] || 'semit'
        const agendaSource = new EventSource('/api/agenda/public/panels/events')
        agendaSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data)
            if (data && typeof data === 'object' && 'senha' in data) {
              this.options.onWake({ type: 'call', id: data.id || Date.now(), raw: data })
            }
          } catch (_err) {}
        }
        const nativeUrl = `/api/panels/${encodeURIComponent(slug)}/events`
        const nativeSource = new EventSource(nativeUrl)
        nativeSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data)
            if (data && typeof data === 'object' && 'senha' in data) {
              this.options.onWake({ type: 'call', id: data.id || Date.now(), raw: data })
            }
          } catch (_err) {}
        }
      }
    } catch (_e) {}
  }""",
    )

cm.write_text(cm_text, encoding='utf-8')
print('connectionManager.ts patched')

ctx_text = ctx.read_text(encoding='utf-8')
old_wake = """        onWake: () => {
          void fetchCalls('mercure')
        },"""
new_wake = """        onWake: (event) => {
          if (event?.raw && typeof event.raw === 'object' && 'senha' in event.raw) {
            const parsed = painelSenhaSchema.safeParse(event.raw)
            if (parsed.success) {
              const directCall = toDisplayCall(parsed.data, 'mercure')
              applyIncoming([directCall])
              return
            }
          }
          void fetchCalls('mercure')
        },"""

if 'event?.raw' not in ctx_text:
    if old_wake not in ctx_text:
        raise SystemExit('onWake block not found in PanelContext')
    ctx_text = ctx_text.replace(old_wake, new_wake)
    ctx.write_text(ctx_text, encoding='utf-8')
    print('PanelContext.tsx patched')
else:
    print('PanelContext.tsx already patched')
