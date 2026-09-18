export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  principalType: "PLATFORM_USER";
  roles: string[];
  permissions: string[];
}

export interface PlatformDashboardMetrics {
  organizationsTotal: number;
  organizationsActive: number;
  organizationsSuspended: number;
  platformUsers: number;
}

export type PlatformOrganizationStatus =
  | "DRAFT"
  | "ONBOARDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "INACTIVE"
  | "CANCELLED";

export type PlatformOrganizationStatusFilter =
  | "ALL"
  | PlatformOrganizationStatus;

export interface PlatformOrganizationCounts {
  users: number;
  enabledModules: number;
}

export interface PlatformOrganizationSummary {
  id: string;
  name: string;
  displayName: string;
  slug: string;
  documentNumber: string | null;
  status: PlatformOrganizationStatus;
  active: boolean;
  organizationType: string | null;
  city: string | null;
  stateCode: string | null;
  countryCode: string | null;
  primaryDomain: string | null;
  counts: PlatformOrganizationCounts;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PlatformOrganizationsResponse {
  items: PlatformOrganizationSummary[];
  pagination: PlatformPagination;
}

export interface PlatformOrganizationMetadata {
  name: string;
  displayName: string;
  slug: string;
  documentNumber?: string;
  institutionalEmail?: string;
  websiteUrl?: string;
  phone?: string;
  organizationType?: string;
  documentFooterAddress?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  sizeCategory?: string;
  printFont?: string;
  trialEndsAt?: string;
}

export interface PlatformOrganizationBrandingInput {
  shortName: string;
  productName?: string;
  primaryColor?: string;
  primaryHoverColor?: string;
  linkColor?: string;
  accentColor?: string;
}

export interface CreatePlatformOrganizationPayload {
  organization: PlatformOrganizationMetadata;
  domain: { hostname: string };
  branding: PlatformOrganizationBrandingInput;
  initialAdmin: {
    name: string;
    email: string;
    password: string;
  };
}

export type UpdatePlatformOrganizationPayload =
  Partial<PlatformOrganizationMetadata>;

export interface PlatformOrganizationDomain {
  id: string;
  hostname: string;
  primary: boolean;
  verifiedAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface PlatformOrganizationBranding {
  shortName: string;
  productName: string | null;
  primaryColor: string | null;
  primaryHoverColor: string | null;
  linkColor: string | null;
  accentColor: string | null;
  loginTitle: string | null;
  loginSubtitle: string | null;
  supportEmail: string | null;
  supportUrl: string | null;
  helpUrl: string | null;
  legalFooter: string | null;
  emailSenderName: string | null;
  emailSenderAddress: string | null;
}

export interface PlatformOrganizationInitialAdmin {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export interface PlatformOrganizationDetail {
  id: string;
  name: string;
  displayName: string;
  slug: string;
  documentNumber: string | null;
  institutionalEmail: string | null;
  websiteUrl: string | null;
  phone: string | null;
  organizationType: string | null;
  documentFooterAddress: string | null;
  city: string | null;
  stateCode: string | null;
  countryCode: string | null;
  sizeCategory: string | null;
  printFont: string | null;
  status: PlatformOrganizationStatus;
  active: boolean;
  startedAt: string | null;
  trialEndsAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
  domains: PlatformOrganizationDomain[];
  branding: PlatformOrganizationBranding | null;
  initialAdmin: PlatformOrganizationInitialAdmin | null;
  counts: PlatformOrganizationCounts & { sectors: number };
}

export interface UpdatePlatformOrganizationAdminPayload {
  name?: string;
  email?: string;
  password?: string;
  active?: boolean;
}

export interface PlatformModuleCatalogItem {
  id: string;
  key: string;
  name: string;
  singularName: string;
  pluralName: string;
  description: string | null;
  category: string;
  icon: string | null;
  version: number;
  sortOrder: number;
  active: boolean;
  enabledOrganizations: number;
  createdAt: string;
  updatedAt: string;
  dependencies?: Array<{ dependsOnModule: { id: string; key: string; name: string } }>;
}

export interface PlatformPlanVersion {
  id: string; version: number; status: "DRAFT" | "PUBLISHED" | "RETIRED";
  priceCents: number; currency: string; billingCycle: "MONTHLY" | "YEARLY";
  userLimit: number | null; storageLimitMb: number | null; effectiveFrom: string | null;
  modules: Array<{ module: PlatformModuleCatalogItem }>;
  _count?: { subscriptions: number };
}
export interface PlatformPlan {
  id: string; key: string; name: string; description: string | null; active: boolean;
  versions: PlatformPlanVersion[];
}

export interface PlatformOrganizationModuleItem
  extends Omit<PlatformModuleCatalogItem, "enabledOrganizations"> {
  enabled: boolean;
  source: string;
  priceAdjustmentCents: number;
}

export interface PlatformOrganizationModulesResponse {
  organization: { id: string; displayName: string; subscription: null | { status: string; planVersion: { id: string; version: number; plan: { name: string } } } };
  modules: PlatformOrganizationModuleItem[];
  pricing: { basePriceCents: number; adjustmentsCents: number; effectivePriceCents: number; billingCycle: "MONTHLY" | "YEARLY"; currency: string };
}
