"use client";

import {
  BarChart3,
  Blocks,
  Building2,
  CircleDollarSign,
  Gauge,
  Globe2,
  Headphones,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const PLATFORM_NAV_ITEMS = [
  { label: "Visão Geral", href: "/platform-admin", icon: Gauge },
  {
    label: "Organizações",
    href: "/platform-admin/organizations",
    icon: Building2,
  },
  { label: "Planos", href: "/platform-admin/plans", icon: CircleDollarSign },
  { label: "Módulos", href: "/platform-admin/modules", icon: Blocks },
  { label: "Domínios", href: "/platform-admin/domains", icon: Globe2 },
  {
    label: "Usuários da Plataforma",
    href: "/platform-admin/users",
    icon: Users,
  },
  { label: "Métricas", href: "/platform-admin/metrics", icon: BarChart3 },
  { label: "Auditoria", href: "/platform-admin/audit", icon: ScrollText },
  {
    label: "Segurança",
    href: "/platform-admin/security",
    icon: ShieldCheck,
  },
  { label: "Suporte", href: "/platform-admin/support", icon: Headphones },
  {
    label: "Configurações",
    href: "/platform-admin/settings",
    icon: Settings,
  },
] as const;

export function PlatformSidebar() {
  const pathname = usePathname();

  return (
    <aside className="platform-sidebar" aria-label="Navegação da plataforma">
      <Link className="platform-brand" href="/platform-admin">
        <span className="platform-brand-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs/logos/logo1.png" alt="SD_Docs" />
        </span>
        <span>
          <strong>SD_Docs</strong>
          <small>Control Plane / Platform Admin</small>
        </span>
      </Link>
      <nav className="platform-nav">
        {PLATFORM_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/platform-admin"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`platform-nav-link ${active ? "active" : ""}`}
            >
              <Icon size={18} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
