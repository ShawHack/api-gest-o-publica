import { Link } from 'react-router-dom'
import { Clock } from '../components/Clock'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { useFullscreen } from '../hooks/useFullscreen'
import { CallHistory } from '../features/calls/CallHistory'
import { usePanel } from '../features/calls/usePanel'
import { DemoPanel } from '../features/demo/DemoPanel'
import { CurrentCall } from '../features/display/CurrentCall'
import { MediaCarousel } from '../features/media/MediaCarousel'
import { NewsTicker } from '../features/media/NewsTicker'
import { SupportWidgets } from '../features/media/SupportWidgets'
import { normalizeUnits, unitsLabel } from '../utils/units'
import './DisplayPage.css'

export function DisplayPage() {
  const {
    settings,
    current,
    history,
    highlight,
    announcing,
    connectionStatus,
    connectionDetail,
    soundUnlocked,
    unlockSound,
    hasSession,
    lastError,
  } = usePanel()
  const { toggle, isFullscreen } = useFullscreen()
  const unitText = unitsLabel(normalizeUnits(settings)) || settings.unitName
  const isProgramacao = settings.displayLayout === 'programacao'
  // Pausa TV durante anúncio da senha (e no flash visual da chamada).
  const tvPaused = announcing || Boolean(current && highlight)
  const rssUrl = settings.rssFeedUrl?.trim() || 'https://g1.globo.com/rss/g1/'
  const showTicker = settings.widgetsEnabled !== false

  return (
    <div
      onClick={() => { if (!soundUnlocked) void unlockSound() }}
      className={[
        'display-page',
        showTicker ? 'display-page--with-ticker' : '',
        isFullscreen ? 'display-page--fullscreen' : '',
        isProgramacao ? 'display-page--layout-programacao' : 'display-page--layout-classic',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="display-page__header">
        <h1 className="display-page__title">{settings.panelTitle}</h1>
        <div className="display-page__header-actions">
          <ConnectionBadge status={connectionStatus} detail={connectionDetail} />
          <Clock />
        </div>
      </header>

      <main className="display-page__main">
        {isProgramacao ? (
          <>
            <div className="display-page__program">
              <div className="display-page__program-frame">
                <MediaCarousel
                  items={settings.mediaEnabled ? settings.mediaItems : []}
                  durationMs={settings.mediaDurationMs}
                  paused={tvPaused}
                  tvVolume={settings.tvVolume ?? 1}
                  variant="portrait"
                  emptyTitle="Programação 9:16"
                  emptyHint="Adicione um link, imagem ou vídeo em Mídia / programação"
                />
              </div>
            </div>
            <div className="display-page__content">
              <div className="display-page__featured">
                <CurrentCall
                  call={current}
                  highlight={highlight}
                  unitName={current?.unitName || unitText}
                />
              </div>
              <div className="display-page__side display-page__side--programacao">
                <CallHistory items={history} />
                {settings.widgetsEnabled !== false ? (
                  <SupportWidgets city={settings.weatherCity || 'Garça'} />
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="display-page__featured">
              <CurrentCall
                call={current}
                highlight={highlight}
                unitName={current?.unitName || unitText}
              />
            </div>
            <div className="display-page__side">
              <CallHistory items={history} />
              {settings.widgetsEnabled !== false ? (
                <SupportWidgets city={settings.weatherCity || 'Garça'} />
              ) : null}
            </div>
          </>
        )}
      </main>

      {showTicker ? <NewsTicker rssFeedUrl={rssUrl} /> : null}

      <footer className="display-page__footer" hidden={isFullscreen} aria-hidden={isFullscreen}>
        <div className="display-page__footer-left">
          {!soundUnlocked ? (
            <button type="button" className="display-page__btn primary" onClick={() => void unlockSound()}>
              Ativar som (senha + TV)
            </button>
          ) : null}
          {!hasSession ? (
            <span className="display-page__hint">
              Sessão OAuth necessária — grave Client ID/Secret/usuário/senha na edição do painel (admin) e salve
            </span>
          ) : null}
          {lastError ? <span className="display-page__error">{lastError}</span> : null}
        </div>
        <div className="display-page__footer-right">
          <button type="button" className="display-page__btn" onClick={() => void toggle()}>
            Tela cheia
          </button>
          <Link className="display-page__btn" to="/admin">
            Painéis
          </Link>
          <Link className="display-page__btn" to="/settings">
            Configurações locais
          </Link>
        </div>
      </footer>

      <DemoPanel />
    </div>
  )
}
