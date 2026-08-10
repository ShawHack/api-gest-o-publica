import Link from "next/link";
import type { CategoryCard, ToolCard } from "@/lib/tools";
import { ToolIcon } from "./ToolIcon";
import styles from "./ToolsHub.module.css";

export default function CategoryTools({
  category,
  tools,
}: {
  category: CategoryCard;
  tools: ToolCard[];
}) {
  return (
    <div className={styles.wrap}>
      <section className={styles.intro}>
        <p className={styles.kicker}>
          <Link href="/">Início</Link>
          <span aria-hidden="true"> / </span>
          <span>{category.title}</span>
        </p>
        <h1 className={styles.title}>{category.title}</h1>
        <p className={styles.subtitle}>{category.description}</p>
      </section>

      <section className={styles.grid} aria-label={`Ferramentas de ${category.title}`}>
        {tools.map((tool) => (
          <Link key={tool.id} href={tool.href} className={styles.card}>
            <div className={styles.cardBody}>
              <ToolIcon tool={tool} className={styles.icon} />
              <h2>{tool.title}</h2>
              <p>{tool.description}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
