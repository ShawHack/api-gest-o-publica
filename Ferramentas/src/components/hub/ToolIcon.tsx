import type { CategoryCard, ToolCard } from "@/lib/tools";
import type { ReactNode } from "react";

function Frame({
  accent,
  className,
  children,
}: {
  accent: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={className} style={{ background: accent }} aria-hidden>
      {children}
    </span>
  );
}

export function ToolIcon({ tool, className }: { tool: ToolCard; className?: string }) {
  return (
    <Frame accent={tool.accent} className={className}>
      <svg viewBox="0 0 48 48" width="26" height="26" fill="none">
        <path
          d="M16 10h12l8 8v18a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2z"
          stroke="#fff"
          strokeWidth="2.4"
        />
        <path d="M28 10v8h8" stroke="#fff" strokeWidth="2.4" />
        <text
          x="18"
          y="34"
          fill="#fff"
          fontSize="8"
          fontWeight="700"
          fontFamily="Arial,sans-serif"
        >
          {tool.icon.slice(0, 4).toUpperCase()}
        </text>
      </svg>
    </Frame>
  );
}

export function CategoryIcon({
  category,
  className,
}: {
  category: CategoryCard;
  className?: string;
}) {
  const isImages = category.id === "imagens";
  return (
    <Frame accent={category.accent} className={className}>
      <svg viewBox="0 0 48 48" width="28" height="28" fill="none">
        {isImages ? (
          <>
            <rect x="10" y="14" width="28" height="22" rx="3" stroke="#fff" strokeWidth="2.4" />
            <circle cx="18" cy="22" r="3" stroke="#fff" strokeWidth="2" />
            <path d="M12 32l8-7 6 5 4-3 6 5" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <path
              d="M14 10h12l8 8v18a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2z"
              stroke="#fff"
              strokeWidth="2.4"
            />
            <path d="M26 10v8h8" stroke="#fff" strokeWidth="2.4" />
            <path d="M18 26h12M18 32h8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </Frame>
  );
}
