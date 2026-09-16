"use client";

import Link from "next/link";
import { Inbox, LogOut, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { portalTenantName } from "@/lib/branding";
import { useBranding } from "@/components/branding-provider";
import type { ExternalUser } from "@/lib/external-types";

export function ExternalPortalHeader({
  user,
  sessionPending = false,
  loggingOut,
  onLogout,
  staffSession = false,
}: {
  user?: ExternalUser | null;
  sessionPending?: boolean;
  loggingOut?: boolean;
  onLogout?: () => void;
  staffSession?: boolean;
}) {
  const branding = useBranding();
  const tenantName = portalTenantName(branding);
  const customLogo =
    branding.uiLogoUrl && branding.uiLogoUrl !== "/docs/logos/logomarca.png";
  const pathname = usePathname();
  const nextPath = pathname?.startsWith("/portal") ? pathname : "/portal";
  const loginHref = `/portal/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <header className="external-header">
      <Link className="external-header-brand" href="/portal">
        {customLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.uiLogoUrl ?? undefined} alt={tenantName} />
        ) : (
          <strong>{tenantName}</strong>
        )}
        <span>Carta de Serviços</span>
      </Link>
      <div className="external-header-actions">
        {staffSession ? (
          <Link className="external-return-inbox" href="/inbox">
            <Inbox size={17} aria-hidden />
            Voltar à caixa
          </Link>
        ) : null}
        <Link className="external-header-link" href="/portal/ouvidoria">
          Ouvidoria
        </Link>
        {sessionPending ? null : user ? (
          <>
            <Link className="external-header-link" href="/portal/minha-area">
              Minha área
            </Link>
            <span className="external-user-label">{user.person.name}</span>
            {onLogout ? (
              <button
                className="external-logout"
                type="button"
                disabled={loggingOut}
                onClick={onLogout}
              >
                <LogOut size={17} aria-hidden />
                <span>Sair do portal</span>
              </button>
            ) : null}
          </>
        ) : (
          <>
            <Link className="external-header-link" href="/portal/cadastro">
              Criar acesso
            </Link>
            <Link className="external-login-link" href={loginHref}>
              <UserRound size={17} aria-hidden />
              Entrar
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
