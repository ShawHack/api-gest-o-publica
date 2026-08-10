import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './WhatsAppButton.module.css'

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

function WhatsAppButton() {
  const location = useLocation()
  const path = normalizePathname(location.pathname)
  const [hiddenForKeyboard, setHiddenForKeyboard] = useState(false)

  // Memorial: sem FAB nas páginas públicas de autenticação / verificação.
  const authHidden =
    path === '/login' || path === '/register' || path === '/auth/verify-email'

  const routeHidden =
    location.pathname.includes('/shift-handovers') ||
    location.pathname.includes('/monitoramento') ||
    location.pathname.includes('/medicamentos') ||
    location.pathname.includes('/compliance') ||
    location.pathname.includes('/educacao')

  // Oculta o FAB enquanto o teclado virtual está aberto ou o campo de busca está focado,
  // evitando cobrir filtros/resultados no mobile.
  useEffect(() => {
    if (authHidden || routeHidden) return undefined

    const isSearchTarget = (el) => {
      if (!el || el.nodeType !== 1) return false
      return (
        el.id === 'burial-search-input' ||
        el.id === 'burial-search-input-mobile' ||
        el.closest?.('.searchField') ||
        el.closest?.('[data-memorial-search]') ||
        (el.tagName === 'INPUT' &&
          (el.type === 'search' || el.getAttribute('inputmode') === 'search'))
      )
    }

    const sync = () => {
      const vv = window.visualViewport
      const keyboardOpen = vv
        ? window.innerHeight - vv.height > 120
        : false
      const active = document.activeElement
      const searchFocused = isSearchTarget(active)
      setHiddenForKeyboard(keyboardOpen || searchFocused)
    }

    sync()
    window.visualViewport?.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('scroll', sync)
    document.addEventListener('focusin', sync)
    document.addEventListener('focusout', sync)
    window.addEventListener('resize', sync)

    return () => {
      window.visualViewport?.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('scroll', sync)
      document.removeEventListener('focusin', sync)
      document.removeEventListener('focusout', sync)
      window.removeEventListener('resize', sync)
    }
  }, [authHidden, routeHidden])

  if (authHidden || routeHidden || hiddenForKeyboard) {
    return null
  }

  const phoneNumber = '551434710233'
  const whatsappUrl = 'https://wa.me/' + phoneNumber

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.whatsappButton}
      aria-label="Conversar no WhatsApp"
      title="Fale conosco pelo WhatsApp"
    >
      <img
        src="/whatsapp.png"
        alt="WhatsApp"
        className={styles.whatsappIcon}
      />
    </a>
  )
}

export default WhatsAppButton
