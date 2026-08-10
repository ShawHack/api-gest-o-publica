import Link from "next/link";
import { CATEGORIES } from "@/lib/tools";
import { CategoryIcon } from "./ToolIcon";
import styles from "./ToolsHub.module.css";

export default function ToolsHub() {
  return (
    <div className={styles.wrap}>
      <section className={styles.intro}>
        <h1 className={styles.title}>Escolha uma categoria</h1>
        <p className={styles.subtitle}>
          Consulte ramais ou separe o trabalho entre documentos e imagens.
        </p>
      </section>

      <section className={styles.featured} aria-label="Atalhos principais">
        <Link href="/ramais" className={styles.featuredCard}>
          <div className={styles.cardBody}>
            <span className={styles.icon} style={{ background: "#128c7e" }} aria-hidden>
              <svg viewBox="0 0 48 48" width="28" height="28" fill="none">
                <rect x="14" y="8" width="20" height="32" rx="4" stroke="#fff" strokeWidth="2.4" />
                <path d="M20 14h8M20 20h8M20 26h8M20 32h5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </span>
            <h2>Ramais</h2>
            <p>Pesquise por ramal ou nome/setor e compartilhe o contato no WhatsApp.</p>
          </div>
        </Link>
      </section>

      <section className={styles.categoryGrid} aria-label="Categorias disponíveis">
        {CATEGORIES.map((category) => (
          <Link key={category.id} href={category.href} className={styles.categoryCard}>
            <div className={styles.cardBody}>
              <CategoryIcon category={category} className={styles.icon} />
              <h2>{category.title}</h2>
              <p>{category.description}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
