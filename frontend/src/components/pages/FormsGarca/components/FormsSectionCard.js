import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import styles from './FormsSectionCard.module.css'

export default function FormsSectionCard({
  title,
  subtitle,
  badge,
  action,
  children,
  footer,
  collapsible = false,
  defaultCollapsed = false,
  condensed = false,
  className = '',
  id,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const toggleCollapse = () => {
    if (collapsible) {
      setCollapsed((prev) => !prev)
    }
  }

  return (
    <section className={`${styles.card} ${className}`} id={id}>
      {(title || subtitle || action || badge || collapsible) && (
        <div
          className={`${styles.header} ${collapsible ? styles.headerClickable : ''}`}
          onClick={collapsible ? toggleCollapse : undefined}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={
            collapsible
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleCollapse()
                  }
                }
              : undefined
          }
          aria-expanded={collapsible ? !collapsed : undefined}
        >
          <div className={styles.titleArea}>
            <div className={styles.titleRow}>
              {title && <h3 className={styles.title}>{title}</h3>}
              {badge}
            </div>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>

          <div className={styles.actionArea} onClick={(e) => e.stopPropagation()}>
            {action}
            {collapsible && (
              <span className={styles.collapseTrigger} aria-hidden="true">
                {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </span>
            )}
          </div>
        </div>
      )}

      {!collapsed && (
        <>
          <div className={`${styles.body} ${condensed ? styles.bodyCondensed : ''}`}>
            {children}
          </div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </>
      )}
    </section>
  )
}
