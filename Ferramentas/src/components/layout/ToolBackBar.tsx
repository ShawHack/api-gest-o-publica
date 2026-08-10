"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./ToolBackBar.module.css";

export default function ToolBackBar() {
  const pathname = usePathname() || "/";
  if (pathname === "/") return null;

  return (
    <div className={styles.bar}>
      <Link href="/" className={styles.button}>
        <span className={styles.arrow} aria-hidden="true">
          ←
        </span>
        Voltar ao início
      </Link>
    </div>
  );
}
