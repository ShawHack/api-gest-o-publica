"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { withBasePath } from "@/lib/base-path";
import { toolLabelFromPath } from "@/lib/tools";
import AppDrawer from "./AppDrawer";
import styles from "./SemitNavbar.module.css";

export default function SemitNavbar() {
  const pathname = usePathname() || "/";
  const toolName = toolLabelFromPath(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <header className={styles.navbar} role="banner">
        <div className={styles.inner}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            aria-controls="app-drawer"
            onClick={() => setMenuOpen(true)}
          >
            <span className={styles.menuIcon} aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>

          <Link href="/" className={styles.brand} aria-label="Ir para a tela principal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={withBasePath("/brand/miti-logo.png")}
              alt=""
              className={styles.mascot}
              width={288}
              height={288}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = "1";
                  img.src = withBasePath("/brand/s.png");
                }
              }}
            />
            <div className={styles.brandText}>
              <p className={styles.product}>
                <span className={styles.productLead}>Caixa de Ferramentas do</span>
                <span className={styles.productMark}>MITI</span>
              </p>
              <p className={styles.tool}>{toolName}</p>
            </div>
          </Link>
        </div>
      </header>

      <div id="app-drawer">
        <AppDrawer open={menuOpen} onClose={closeMenu} />
      </div>
    </>
  );
}
