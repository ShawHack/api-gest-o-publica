"use client";

import Link from "next/link";
import { useEffect, useId } from "react";
import { usePathname } from "next/navigation";
import styles from "./AppDrawer.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Início", match: (p: string) => p === "/" },
  {
    href: "/categoria/editar-documento",
    label: "Editar documentos",
    match: (p: string) => p.startsWith("/categoria/editar-documento") || p.startsWith("/ferramentas/") || p.startsWith("/editar-pdf"),
  },
  {
    href: "/categoria/editar-imagens",
    label: "Editar imagens",
    match: (p: string) =>
      p.startsWith("/categoria/editar-imagens") ||
      p.startsWith("/conversor") ||
      p.startsWith("/jpg-para-pdf") ||
      p.startsWith("/pdf-para-jpg"),
  },
  { href: "/ramais", label: "Ramais", match: (p: string) => p.startsWith("/ramais") },
] as const;

type AppDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function AppDrawer({ open, onClose }: AppDrawerProps) {
  const pathname = usePathname() || "/";
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div className={`${styles.root} ${open ? styles.open : ""}`} aria-hidden={!open}>
      <button type="button" className={styles.backdrop} aria-label="Fechar menu" onClick={onClose} tabIndex={open ? 0 : -1} />
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.panelHead}>
          <p id={titleId} className={styles.panelTitle}>
            Menu
          </p>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <nav className={styles.nav} aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.link} ${active ? styles.linkActive : ""}`}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
