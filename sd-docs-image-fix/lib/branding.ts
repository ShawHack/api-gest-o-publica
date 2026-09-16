import { API_URL } from "./session";

export interface PublicBranding {
  productName: string;
  shortName: string;
  displayName: string | null;
  organizationName: string | null;
  uiLogoUrl: string | null;
  uiLogoHeight: number;
  uiLogoWidth: number | null;
  headerLogoUrl: string | null;
  headerLogoHeight: number;
  headerLogoWidth: number | null;
  loginLogoUrl: string | null;
  loginLogoHeight: number;
  loginLogoWidth: number | null;
  faviconUrl: string | null;
  primaryColor: string;
  primaryHoverColor: string;
  linkColor: string;
  accentColor: string;
  loginTitle: string | null;
  loginSubtitle: string | null;
  supportUrl: string | null;
  helpUrl: string | null;
  legalFooter: string | null;
  portalCoverUrls: string[];
}

export const DEFAULT_BRANDING: PublicBranding = {
  productName: "SD_Docs",
  shortName: "SD_Docs",
  displayName: null,
  organizationName: null,
  uiLogoUrl: "/docs/logos/logomarca.png",
  uiLogoHeight: 35,
  uiLogoWidth: null,
  headerLogoUrl: null,
  headerLogoHeight: 30,
  headerLogoWidth: null,
  loginLogoUrl: "/docs/logos/logomarca.png",
  loginLogoHeight: 52,
  loginLogoWidth: null,
  faviconUrl: "/docs/logos/logo1.png",
  primaryColor: "#1b4f8c",
  primaryHoverColor: "#143a6b",
  linkColor: "#1b4f8c",
  accentColor: "#4a90d9",
  loginTitle: "Acessar SD_Docs",
  loginSubtitle: null,
  supportUrl: null,
  helpUrl: null,
  legalFooter: null,
  portalCoverUrls: [],
};

export function isDefaultBranding(branding: PublicBranding): boolean {
  return (
    branding.productName === DEFAULT_BRANDING.productName &&
    branding.shortName === DEFAULT_BRANDING.shortName &&
    branding.uiLogoUrl === DEFAULT_BRANDING.uiLogoUrl &&
    branding.uiLogoHeight === DEFAULT_BRANDING.uiLogoHeight &&
    branding.uiLogoWidth === DEFAULT_BRANDING.uiLogoWidth &&
    branding.headerLogoUrl === DEFAULT_BRANDING.headerLogoUrl &&
    branding.headerLogoHeight === DEFAULT_BRANDING.headerLogoHeight &&
    branding.headerLogoWidth === DEFAULT_BRANDING.headerLogoWidth &&
    branding.loginLogoUrl === DEFAULT_BRANDING.loginLogoUrl &&
    branding.loginLogoHeight === DEFAULT_BRANDING.loginLogoHeight &&
    branding.loginLogoWidth === DEFAULT_BRANDING.loginLogoWidth &&
    branding.faviconUrl === DEFAULT_BRANDING.faviconUrl &&
    branding.primaryColor === DEFAULT_BRANDING.primaryColor &&
    branding.primaryHoverColor === DEFAULT_BRANDING.primaryHoverColor &&
    branding.linkColor === DEFAULT_BRANDING.linkColor &&
    branding.accentColor === DEFAULT_BRANDING.accentColor &&
    branding.loginTitle === DEFAULT_BRANDING.loginTitle &&
    branding.loginSubtitle === DEFAULT_BRANDING.loginSubtitle
  );
}

export function portalTenantName(branding: PublicBranding): string {
  return branding.displayName?.trim() || branding.productName;
}

function withDocsBasePath(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/logos/") ? `/docs${url}` : url;
}

function withBrandingDefaults(
  branding: Partial<PublicBranding>,
): PublicBranding {
  return {
    ...DEFAULT_BRANDING,
    ...branding,
    displayName: branding.displayName?.trim() || null,
    organizationName: branding.organizationName?.trim() || null,
    uiLogoUrl:
      withDocsBasePath(branding.uiLogoUrl) ?? DEFAULT_BRANDING.uiLogoUrl,
    uiLogoHeight: branding.uiLogoHeight ?? DEFAULT_BRANDING.uiLogoHeight,
    uiLogoWidth: branding.uiLogoWidth ?? null,
    headerLogoUrl: withDocsBasePath(branding.headerLogoUrl),
    headerLogoHeight:
      branding.headerLogoHeight ?? DEFAULT_BRANDING.headerLogoHeight,
    headerLogoWidth: branding.headerLogoWidth ?? null,
    loginLogoUrl:
      withDocsBasePath(branding.loginLogoUrl) ?? DEFAULT_BRANDING.loginLogoUrl,
    loginLogoHeight:
      branding.loginLogoHeight ?? DEFAULT_BRANDING.loginLogoHeight,
    loginLogoWidth: branding.loginLogoWidth ?? null,
    faviconUrl:
      withDocsBasePath(branding.faviconUrl) ?? DEFAULT_BRANDING.faviconUrl,
    portalCoverUrls: Array.isArray(branding.portalCoverUrls)
      ? branding.portalCoverUrls.filter(Boolean).slice(0, 4)
      : [],
  };
}

export async function fetchBranding(hostname: string): Promise<PublicBranding> {
  if (!hostname) return DEFAULT_BRANDING;
  try {
    const response = await fetch(
      `${API_URL}/public/branding?hostname=${encodeURIComponent(hostname)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return DEFAULT_BRANDING;
    return withBrandingDefaults(
      (await response.json()) as Partial<PublicBranding>,
    );
  } catch {
    return DEFAULT_BRANDING;
  }
}
