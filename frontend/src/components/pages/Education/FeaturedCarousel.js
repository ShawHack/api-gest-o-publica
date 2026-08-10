import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listFeaturedNews, listNews } from '../../../services/educationService'
import { formatDate, postThumbnail, POST_TYPE_LABELS } from './educationUtils'
import styles from './EducationPortal.module.css'

const AUTOPLAY_MS = 6000

function getStep(track) {
  const slide = track.firstElementChild
  if (!slide) return 0
  const gap = parseFloat(getComputedStyle(track).gap) || 16
  return slide.offsetWidth + gap
}

function getVisibleCount(track) {
  const step = getStep(track)
  if (!step) return 1
  return Math.max(1, Math.floor((track.clientWidth + parseFloat(getComputedStyle(track).gap || 16)) / step))
}

export default function FeaturedCarousel() {
  const [items, setItems] = useState([])
  const [sectionTitle, setSectionTitle] = useState('Em destaque')
  const trackRef = useRef(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadCarouselItems() {
      try {
        const { data } = await listFeaturedNews()
        if (cancelled) return

        const featured = data?.data || []
        if (featured.length > 0) {
          setItems(featured)
          setSectionTitle('Em destaque')
          return
        }

        const { data: newsData } = await listNews({ limit: 12 })
        if (!cancelled) {
          const recent = newsData?.data || []
          setItems(recent)
          setSectionTitle(recent.length > 0 ? 'Publicações recentes' : 'Em destaque')
        }
      } catch {
        if (!cancelled) setItems([])
      }
    }

    loadCarouselItems()
    return () => { cancelled = true }
  }, [])

  const scroll = useCallback((direction) => {
    const track = trackRef.current
    if (!track) return
    const step = getStep(track)
    if (!step) return

    const maxScroll = track.scrollWidth - track.clientWidth
    if (direction > 0 && track.scrollLeft >= maxScroll - 4) {
      track.scrollTo({ left: 0, behavior: 'smooth' })
      return
    }
    if (direction < 0 && track.scrollLeft <= 4) {
      track.scrollTo({ left: maxScroll, behavior: 'smooth' })
      return
    }
    track.scrollBy({ left: direction * step, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (items.length <= 1) return undefined

    const track = trackRef.current
    if (!track) return undefined

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return undefined

    const pause = () => { pausedRef.current = true }
    const resume = () => { pausedRef.current = false }

    track.addEventListener('mouseenter', pause)
    track.addEventListener('mouseleave', resume)
    track.addEventListener('pointerdown', pause)
    track.addEventListener('pointerup', resume)
    track.addEventListener('focusin', pause)
    track.addEventListener('focusout', resume)

    const tick = () => {
      if (pausedRef.current) return
      const visible = getVisibleCount(track)
      if (items.length <= visible) return
      scroll(1)
    }

    const id = window.setInterval(tick, AUTOPLAY_MS)
    return () => {
      window.clearInterval(id)
      track.removeEventListener('mouseenter', pause)
      track.removeEventListener('mouseleave', resume)
      track.removeEventListener('pointerdown', pause)
      track.removeEventListener('pointerup', resume)
      track.removeEventListener('focusin', pause)
      track.removeEventListener('focusout', resume)
    }
  }, [items, scroll])

  if (!items.length) return null

  const canScroll = items.length > 1

  return (
    <section className={styles.featured_carousel} aria-label="Destaques">
      <div className={styles.featured_carousel_header}>
        <div className={styles.featured_carousel_heading}>
          <h2>{sectionTitle}</h2>
          {items.length > 2 && (
            <span className={styles.carousel_hint}>Deslize ou use as setas para ver mais</span>
          )}
        </div>
        {canScroll && (
          <div className={styles.carousel_controls}>
            <button
              type="button"
              className={styles.carousel_btn}
              onClick={() => scroll(-1)}
              aria-label="Destaque anterior"
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.carousel_btn}
              onClick={() => scroll(1)}
              aria-label="Próximo destaque"
            >
              ›
            </button>
          </div>
        )}
      </div>
      <div className={styles.carousel_track} ref={trackRef}>
        {items.map((post) => {
          const thumb = postThumbnail(post)
          return (
            <Link
              key={post._id}
              to={`/educacao/noticias/${post.slug}`}
              className={styles.carousel_slide}
            >
              <div className={styles.carousel_media}>
                {thumb ? (
                  <img src={thumb} alt="" className={styles.carousel_image} loading="lazy" />
                ) : (
                  <div className={styles.carousel_placeholder} />
                )}
              </div>
              <div className={styles.carousel_body}>
                <span className={styles.badge}>
                  {POST_TYPE_LABELS[post.type] || post.type}
                </span>
                <h3>{post.title}</h3>
                {post.summary && <p>{post.summary}</p>}
                <span className={styles.carousel_meta}>{formatDate(post.publishedAt)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
