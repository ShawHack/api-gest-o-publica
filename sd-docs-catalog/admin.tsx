"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Edit3,
  FileType2,
  FolderTree,
  History,
  Link2,
  Search,
  Tag,
  UsersRound,
  X,
  ImagePlus,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AdminBackButton } from "./admin-back-button";
import { AdminListToolbar } from "./admin-list-toolbar";
import type {
  AdminUser,
  CurrentUser,
  MarkerNode,
  OrganizationBrandingSettings,
  OrganizationSettings,
  ProfileLevel,
  SectorNode,
  TaxonomyContext,
  TaxonomyNode,
} from "@/lib/types";
import { SectorsPage, SectorHierarchyTable, sortSectorTree } from "./admin-sectors";
import { SubjectsPage } from "./admin-subjects";
import { FileNamesPage } from "./admin-file-names";
import { api, ApiError } from "@/lib/api";
import { normalizeHexForPicker } from "@/lib/branding";
import { PasswordInput } from "@/components/ui";
import { useDialog } from "@/components/ui/dialog-provider";
import { FilterPillSelect } from "@/components/ui/filter-pill-select";
import { visibleAdminItems } from "@/lib/nav-catalog";

export { SectorsPage, SectorHierarchyTable, SubjectsPage };

const todoVisual = "Em breve nesta versão";

type AdminNavigationUser = Pick<CurrentUser, "profileLevel" | "permissions">;

async function uploadUserAvatar(userId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return api<AdminUser>(`/api/backend/admin/users/${userId}/avatar`, {
    method: "POST",
    body: form,
  });
}

/** Mantido por compatibilidade; Gestão agora vive na sidebar global. */
export function AdminHorizontalNavigation({
  user,
}: {
  user?: AdminNavigationUser;
}) {
  const pathname = usePathname();
  if (!user) return null;
  const visibleItems = visibleAdminItems(user);
  if (!visibleItems.length) return null;
  return (
    <nav className="admin-subnav" aria-label="Gestão">
      {visibleItems.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={pathname === item.href ? "active" : ""}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export const AdminNavigation = AdminHorizontalNavigation;

export function AdminListDropdown() {
  return (
    <button
      type="button"
      className="admin-button"
      disabled
      title="Em breve nesta versão"
    >
      Filtrar lista
    </button>
  );
}

export function AdminCountToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="admin-count-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>Mostrar contagem</span>
    </label>
  );
}

export function AdminSearch({
  label = "Buscar",
  placeholder = "",
  onSearch,
}: {
  label?: string;
  placeholder?: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="admin-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <input
        aria-label={placeholder || "Busca"}
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className="admin-button">
        <Search size={16} aria-hidden /> {label}
      </button>
    </form>
  );
}

export function AdminTaxonomyContextDropdown({
  contexts,
  value,
  onChange,
}: {
  contexts: TaxonomyContext[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FilterPillSelect
      label="Contexto"
      hideLabel
      value={value}
      className="sd-pill-select admin-toolbar-pill"
      onChange={onChange}
      options={contexts.map((context) => ({
        value: context.key,
        label: context.name,
      }))}
    />
  );
}

export function CompactAdminActions({
  subject,
  variant = "user",
}: {
  subject: string;
  variant?: "user" | "sector" | "taxonomy";
}) {
  return (
    <div className="compact-admin-actions">
      <button
        type="button"
        disabled
        title={todoVisual}
        aria-label={`Editar ${subject}`}
      >
        <Edit3 size={16} />
      </button>
      <button
        type="button"
        disabled
        title={todoVisual}
        aria-label={
          variant === "sector"
            ? `Pessoas usuárias de ${subject}`
            : `Desativar ${subject}`
        }
      >
        {variant === "sector" ? <UsersRound size={16} /> : <Ban size={16} />}
      </button>
      {variant === "taxonomy" && (
        <button
          type="button"
          disabled
          title="Em breve nesta versão"
          aria-label={`Terceira ação de ${subject}`}
        >
          <Link2 size={16} />
        </button>
      )}
    </div>
  );
}

export function PaginationCompact() {
  return (
    <div className="pagination-compact" aria-label="Paginação">
      <span>Página</span>
      <span className="pagination-page">1</span>
      <span>de 1</span>
    </div>
  );
}

export function HierarchyConnector({
  depth,
  children,
}: {
  depth: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="hierarchy-cell"
      style={{ "--tree-depth": depth } as React.CSSProperties}
    >
      {depth > 0 && <span className="hierarchy-connector" aria-hidden />}
      {children}
    </div>
  );
}

function flattenTree<T extends { children: T[] }>(
  nodes: T[],
  depth = 0,
): Array<{ node: T; depth: number }> {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flattenTree(node.children, depth + 1),
  ]);
}

export function HierarchyTable({ children }: { children: React.ReactNode }) {
  return <div className="table-scroll admin-table-wrap">{children}</div>;
}

export function MarkerBadge({ marker }: { marker: MarkerNode }) {
  return (
    <span className="marker-badge" style={{ backgroundColor: marker.color }}>
      <Tag size={14} aria-hidden /> {marker.name}
    </span>
  );
}

export function TaxonomyRow({
  item,
  depth,
  kind,
  showCount,
  onEditMarker,
}: {
  item: TaxonomyNode | MarkerNode;
  depth: number;
  kind: "subject" | "type" | "marker";
  showCount: boolean;
  onEditMarker?: (marker: MarkerNode) => void;
}) {
  return (
    <tr>
      {kind === "marker" && <td className="id-cell">{item.id.slice(0, 8)}</td>}
      <td>
        <HierarchyConnector depth={depth}>
          {kind === "marker" ? (
            <MarkerBadge marker={item as MarkerNode} />
          ) : (
            item.name
          )}
          {showCount && <span className="item-count">({item.count ?? 0})</span>}
        </HierarchyConnector>
      </td>
      {kind === "subject" && <td>{item.serviceCode || "—"}</td>}
      <td>
        {kind === "marker" && onEditMarker ? (
          <div className="compact-admin-actions">
            <button
              type="button"
              aria-label={`Editar ${item.name}`}
              onClick={() => onEditMarker(item as MarkerNode)}
            >
              <Edit3 size={16} />
            </button>
          </div>
        ) : (
          <CompactAdminActions subject={item.name} variant="taxonomy" />
        )}
      </td>
    </tr>
  );
}

export function TaxonomyTable({
  items,
  kind,
  showCount,
  onEditMarker,
}: {
  items: TaxonomyNode[] | MarkerNode[];
  kind: "subject" | "type" | "marker";
  showCount: boolean;
  onEditMarker?: (marker: MarkerNode) => void;
}) {
  const columns =
    kind === "subject"
      ? ["Categoria", "Serviço", "Ações"]
      : kind === "type"
        ? ["Classificação", "Ações"]
        : ["ID", "Etiqueta", "Ações"];
  return (
    <HierarchyTable>
      <table className={`admin-data-table taxonomy-table ${kind}-table`}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flattenTree(items).map(({ node, depth }) => (
            <TaxonomyRow
              key={node.id}
              item={node}
              depth={depth}
              kind={kind}
              showCount={showCount}
              onEditMarker={onEditMarker}
            />
          ))}
          {!items.length && (
            <tr>
              <td colSpan={columns.length} className="empty-row">
                Nenhum item habilitado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </HierarchyTable>
  );
}

export function MarkerHierarchy({
  markers,
  showCount,
  onEdit,
}: {
  markers: MarkerNode[];
  showCount: boolean;
  onEdit?: (marker: MarkerNode) => void;
}) {
  return (
    <TaxonomyTable
      items={markers}
      kind="marker"
      showCount={showCount}
      onEditMarker={onEdit}
    />
  );
}

function filterMarkerTree(markers: MarkerNode[], search: string): MarkerNode[] {
  const normalized = search.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return markers;
  return markers.flatMap((marker) => {
    const children = filterMarkerTree(marker.children, normalized);
    return marker.name.toLocaleLowerCase("pt-BR").includes(normalized) ||
      children.length
      ? [{ ...marker, children }]
      : [];
  });
}

export function resolveBrandingUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.startsWith("/docs/")) return url;
  if (url.startsWith("/")) return `/docs${url}`;
  return `/docs/${url}`;
}

export function OrganizationLogoUpload({
  kind,
  currentUrl,
  height,
  width,
  onHeightChange,
  onWidthChange,
  onUploaded,
}: {
  kind: "ui" | "header" | "login" | "favicon";
  currentUrl: string | null;
  height?: number;
  width?: number | null;
  onHeightChange?: (height: number) => void;
  onWidthChange?: (width: number | null) => void;
  onUploaded: (branding: OrganizationBrandingSettings) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowedExtensions =
    kind === "favicon"
      ? [".png", ".ico"]
      : kind === "header"
        ? [".png", ".jpg", ".jpeg", ".webp"]
        : [".png", ".jpg", ".jpeg", ".webp", ".svg"];
  const formatHelp =
    kind === "favicon"
      ? "PNG ou ICO (máximo de 20 MB)"
      : kind === "header"
        ? "PNG, JPEG ou WebP (máximo de 20 MB)"
        : "PNG, JPEG, WebP ou SVG (máximo de 20 MB)";
  return (
    <div
      className="logo-upload"
      style={{
        cursor: "pointer",
        position: "relative",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onClick={(e) => {
        // Only trigger file picker if not clicking on number inputs or already uploading
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "BUTTON" && !uploading) {
          fileInputRef.current?.click();
        }
      }}
    >
      <label style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "4px", display: "block" }}>
        {kind === "favicon"
          ? "Favicon"
          : `Logo ${kind === "ui" ? "do sistema" : kind === "header" ? "da Prefeitura no cabeçalho" : "do login"}`}
      </label>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        accept={
          kind === "favicon"
            ? "image/png,image/x-icon,image/vnd.microsoft.icon,.ico"
            : kind === "header"
              ? "image/png,image/jpeg,image/webp"
              : "image/png,image/jpeg,image/webp,image/svg+xml"
        }
        disabled={uploading}
        onChange={async (event) => {
          const input = event.currentTarget;
          const file = event.target.files?.[0];
          if (!file) return;
          setError(null);
          const lowerName = file.name.toLowerCase();
          if (
            !allowedExtensions.some((extension) =>
              lowerName.endsWith(extension),
            )
          ) {
            setError(`Formato aceito: ${allowedExtensions.join(", ")}`);
            input.value = "";
            return;
          }
          if (file.size === 0 || file.size > 20 * 1024 * 1024) {
            setError("A imagem deve ter entre 1 byte e 20 MB.");
            input.value = "";
            return;
          }
          setUploading(true);
          const body = new FormData();
          body.set("kind", kind);
          body.set("file", file);
          try {
            const branding = await api<OrganizationBrandingSettings>(
              "/api/backend/admin/organization/branding/logo",
              {
                method: "POST",
                body,
              },
            );
            onUploaded(branding);
          } catch (cause) {
            setError(
              cause instanceof ApiError
                ? cause.message
                : "Não foi possível enviar a imagem.",
            );
          } finally {
            setUploading(false);
            input.value = "";
          }
        }}
      />
      <button
        type="button"
        className="admin-action-add"
        style={{
          width: "100%",
          margin: "8px 0",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "8px 12px",
          borderRadius: "6px",
        }}
        disabled={uploading}
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
      >
        <ImagePlus size={16} />
        {uploading ? "Enviando imagem…" : "Escolher foto / arquivo"}
      </button>
      <small style={{ display: "block", color: "var(--text-muted, #64748b)", fontSize: "0.8rem", marginBottom: "8px" }}>
        {formatHelp}
      </small>
      {kind !== "favicon" && height && onHeightChange ? (
        <div className="logo-size-fields" onClick={(e) => e.stopPropagation()}>
          <label className="logo-size-field">
            Altura (px)
            <input
              type="number"
              min={16}
              max={200}
              value={height}
              onChange={(event) =>
                onHeightChange(
                  Math.min(200, Math.max(16, Number(event.target.value) || 16)),
                )
              }
            />
          </label>
          {onWidthChange ? (
            <label className="logo-size-field">
              Largura (px)
              <input
                type="number"
                min={16}
                max={200}
                placeholder="Auto"
                value={width ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  onWidthChange(
                    value === ""
                      ? null
                      : Math.min(200, Math.max(16, Number(value) || 16)),
                  );
                }}
              />
            </label>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <span role="alert" style={{ color: "#ef4444", fontSize: "0.85rem", display: "block", marginTop: "4px" }}>
          {error}
        </span>
      ) : null}
      <span className="current-logo" style={{ marginTop: "10px", display: "block" }}>
        <strong>Logo atual</strong>
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveBrandingUrl(currentUrl) ?? currentUrl}
            alt="Pré-visualização da logo atual"
            style={{
              height,
              width: width ?? "auto",
              maxWidth: "100%",
              objectFit: "contain",
              marginTop: "6px",
              display: "block",
              background: "rgba(0,0,0,0.03)",
              padding: "4px",
              borderRadius: "4px",
            }}
          />
        ) : (
          <span style={{ display: "block", color: "var(--text-muted, #94a3b8)", fontSize: "0.85rem", marginTop: "4px" }}>
            Nenhum logo disponível
          </span>
        )}
      </span>
    </div>
  );
}

export function OrganizationSettingsForm({
  organization,
}: {
  organization: OrganizationSettings;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState(organization);
  const [productNameEdited, setProductNameEdited] = useState(false);
  // Header and page title read branding.productName, so it follows the display name
  // until someone overrides it here.
  const effectiveProductName =
    productNameEdited || !form.displayName
      ? (form.branding?.productName ?? "")
      : form.displayName;
  const update = useMutation({
    mutationFn: async () => {
      await api<OrganizationSettings>("/api/backend/admin/organization", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          displayName: form.displayName,
          phone: form.phone,
          organizationType: form.organizationType,
          documentFooterAddress: form.documentFooterAddress,
          city: form.city,
          sizeCategory: form.sizeCategory,
          printFont: form.printFont,
        }),
      });
      if (form.branding) {
        // Only DTO fields — uiLogoUrl/faviconUrl/etc. trigger 400 with forbidNonWhitelisted.
        const branding = {
          productName: effectiveProductName || form.branding.productName,
          shortName: form.branding.shortName,
          primaryColor: form.branding.primaryColor,
          primaryHoverColor: form.branding.primaryHoverColor,
          linkColor: form.branding.linkColor,
          accentColor: form.branding.accentColor,
          loginTitle: form.branding.loginTitle || null,
          loginSubtitle: form.branding.loginSubtitle || null,
          supportUrl: form.branding.supportUrl || null,
          helpUrl: form.branding.helpUrl || null,
          legalFooter: form.branding.legalFooter || null,
          uiLogoHeight: form.branding.uiLogoHeight ?? 48,
          uiLogoWidth: form.branding.uiLogoWidth ?? null,
          headerLogoHeight: form.branding.headerLogoHeight ?? 30,
          headerLogoWidth: form.branding.headerLogoWidth ?? null,
          loginLogoHeight: form.branding.loginLogoHeight ?? 52,
          loginLogoWidth: form.branding.loginLogoWidth ?? null,
        };
        await api("/api/backend/admin/organization/branding", {
          method: "PATCH",
          body: JSON.stringify(branding),
        });
      }
      return api<OrganizationSettings>("/api/backend/admin/organization");
    },
    onSuccess: (data) => {
      client.setQueryData(["admin-organization"], data);
      setForm(data);
      setProductNameEdited(false);
      // Branding is rendered from the server layout; refresh so header/title follow.
      router.refresh();
    },
  });
  const set = (key: keyof OrganizationSettings, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const setBranding = (
    key: keyof NonNullable<OrganizationSettings["branding"]>,
    value: string,
  ) => {
    if (key === "productName") setProductNameEdited(true);
    setForm((current) => ({
      ...current,
      branding: current.branding ? { ...current.branding, [key]: value } : null,
    }));
  };

  return (
    <section className="sd-create-page">
      <header className="sd-create-header">
        <span>Administração</span>
        <h1>Preferências da organização</h1>
        <p>
          Ajuste a identidade institucional e os dados usados nos documentos e
          no portal.
        </p>
      </header>
      <form
        className="sd-form"
        onSubmit={(event) => {
          event.preventDefault();
          update.mutate();
        }}
      >
        <fieldset className="sd-form-section">
          <legend>
            <span>01</span>
            Dados institucionais
          </legend>
          <p>
            Informações básicas usadas em documentos e comunicações oficiais.
          </p>
          <div className="sd-form-grid">
            <label className="sd-field">
              Nome da Organização
              <input
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
              />
            </label>
            <label className="sd-field">
              Nome de Exibição
              <input
                value={form.displayName ?? ""}
                onChange={(event) => set("displayName", event.target.value)}
              />
            </label>
            <label className="sd-field">
              Telefone
              <input
                value={form.phone ?? ""}
                onChange={(event) => set("phone", event.target.value)}
              />
            </label>
            <label className="sd-field">
              Tipo
              <FilterPillSelect
                label="Tipo"
                hideLabel
                value={form.organizationType ?? ""}
                className="sd-pill-select"
                placeholder="Selecione"
                onChange={(next) => set("organizationType", next)}
                options={[
                  { value: "", label: "Selecione" },
                  ...[
                    "Prefeitura",
                    "Câmara",
                    "Autarquia",
                    "Fundação",
                    "Empresa pública",
                    "Consórcio",
                    "Instituto",
                    "Outro",
                  ].map((type) => ({ value: type, label: type })),
                ]}
              />
            </label>
            <label className="sd-field sd-field-full">
              Endereço completo (para rodapé dos documentos)
              <textarea
                rows={3}
                value={form.documentFooterAddress ?? ""}
                onChange={(event) =>
                  set("documentFooterAddress", event.target.value)
                }
              />
            </label>
            <label className="sd-field">
              Cidade
              <input
                value={form.city ?? ""}
                onChange={(event) => set("city", event.target.value)}
              />
            </label>
            <label className="sd-field">
              Porte
              <FilterPillSelect
                label="Porte"
                hideLabel
                value={form.sizeCategory ?? "Mais do que 1.000 funcionários"}
                className="sd-pill-select"
                onChange={(next) => set("sizeCategory", next)}
                options={[
                  {
                    value: "Mais do que 1.000 funcionários",
                    label: "Mais do que 1.000 funcionários",
                  },
                ]}
              />
            </label>
            <label className="sd-field">
              Fonte (impressão)
              <FilterPillSelect
                label="Fonte (impressão)"
                hideLabel
                value={form.printFont ?? "Arial"}
                className="sd-pill-select"
                onChange={(next) => set("printFont", next)}
                options={[{ value: "Arial", label: "Arial" }]}
              />
            </label>
          </div>
        </fieldset>

        {form.branding && (
          <>
            <fieldset className="sd-form-section">
              <legend>
                <span>02</span>
                Identidade do produto
              </legend>
              <p>
                Textos e cores apresentados no cabeçalho, no login e no portal.
              </p>
              <div className="sd-form-grid">
                {(
                  [
                    ["productName", "Nome do produto"],
                    ["shortName", "Nome curto"],
                    ["loginTitle", "Título do login"],
                    ["loginSubtitle", "Subtítulo do login"],
                    ["supportUrl", "URL de suporte"],
                    ["helpUrl", "URL de ajuda"],
                    ["legalFooter", "Rodapé legal"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className={`sd-field${key === "legalFooter" ? " sd-field-full" : ""}`}
                  >
                    {label}
                    <input
                      value={
                        key === "productName"
                          ? effectiveProductName
                          : (form.branding?.[key] ?? "")
                      }
                      onChange={(event) => setBranding(key, event.target.value)}
                    />
                    {key === "productName" && (
                      <small>
                        Aparece no cabeçalho do sistema; acompanha o nome de
                        exibição até você digitar outro valor.
                      </small>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="sd-form-section">
              <legend>
                <span>03</span>
                Cores e mídia
              </legend>
              <p>
                Personalize a paleta institucional e os arquivos de marca da
                organização.
              </p>
              <div className="sd-form-grid">
                {(
                  [
                    ["primaryColor", "Cor primária", "#1b4f8c"],
                    ["primaryHoverColor", "Cor primária (hover)", "#143a6b"],
                    ["linkColor", "Cor dos links", "#1b4f8c"],
                    ["accentColor", "Cor de destaque", "#4a90d9"],
                  ] as const
                ).map(([key, label, fallback]) => (
                  <label key={key} className="sd-field">
                    {label}
                    <div className="sd-color-field">
                      <input
                        type="color"
                        className="sd-color-swatch"
                        value={normalizeHexForPicker(
                          form.branding?.[key],
                          fallback,
                        )}
                        onChange={(event) =>
                          setBranding(key, event.target.value)
                        }
                        aria-label={`${label} — seletor visual`}
                        title="Abrir seletor de cores"
                      />
                      <input
                        value={form.branding?.[key] ?? ""}
                        onChange={(event) =>
                          setBranding(key, event.target.value)
                        }
                        placeholder={fallback}
                        spellCheck={false}
                        autoComplete="off"
                      />
                    </div>
                  </label>
                ))}
              </div>
              <div className="sd-logo-uploads">
                {(["ui", "header", "login", "favicon"] as const).map((kind) => (
                  <OrganizationLogoUpload
                    key={kind}
                    kind={kind}
                    currentUrl={
                      form.branding?.[
                        kind === "ui"
                          ? "uiLogoUrl"
                          : kind === "header"
                            ? "headerLogoUrl"
                            : kind === "login"
                              ? "loginLogoUrl"
                              : "faviconUrl"
                      ] ?? null
                    }
                    height={
                      kind === "ui"
                        ? (form.branding?.uiLogoHeight ?? 48)
                        : kind === "header"
                          ? (form.branding?.headerLogoHeight ?? 30)
                          : kind === "login"
                            ? (form.branding?.loginLogoHeight ?? 52)
                            : undefined
                    }
                    width={
                      kind === "ui"
                        ? (form.branding?.uiLogoWidth ?? null)
                        : kind === "header"
                          ? (form.branding?.headerLogoWidth ?? null)
                          : kind === "login"
                            ? (form.branding?.loginLogoWidth ?? null)
                            : undefined
                    }
                    onHeightChange={
                      kind === "favicon"
                        ? undefined
                        : (height) =>
                            setForm((current) => ({
                              ...current,
                              branding: current.branding
                                ? {
                                    ...current.branding,
                                    [kind === "ui"
                                      ? "uiLogoHeight"
                                      : kind === "header"
                                        ? "headerLogoHeight"
                                        : "loginLogoHeight"]: height,
                                  }
                                : null,
                            }))
                    }
                    onWidthChange={
                      kind === "favicon"
                        ? undefined
                        : (width) =>
                            setForm((current) => ({
                              ...current,
                              branding: current.branding
                                ? {
                                    ...current.branding,
                                    [kind === "ui"
                                      ? "uiLogoWidth"
                                      : kind === "header"
                                        ? "headerLogoWidth"
                                        : "loginLogoWidth"]: width,
                                  }
                                : null,
                            }))
                    }
                    onUploaded={(branding) => {
                      setForm((current) => ({ ...current, branding }));
                      void client.invalidateQueries({
                        queryKey: ["admin-organization"],
                      });
                      router.refresh();
                    }}
                  />
                ))}
              </div>
            </fieldset>
          </>
        )}

        {update.isError && (
          <p className="sd-form-error" role="alert">
            {update.error instanceof ApiError
              ? update.error.message
              : "Não foi possível salvar as preferências da organização."}
          </p>
        )}
        {update.isSuccess && (
          <p className="inline-success">Preferências da organização salvas.</p>
        )}
        <footer className="sd-form-actions">
          <button
            className="admin-button"
            type="submit"
            disabled={update.isPending}
          >
            {update.isPending ? "Salvando…" : "Salvar preferências"}
          </button>
        </footer>
      </form>
    </section>
  );
}

function AdminTitle({
  icon,
  children,
  subtitle,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <header className="admin-title">
      <h1>
        {icon}
        {children}
      </h1>
      {subtitle && <div className="admin-subtitle">{subtitle}</div>}
    </header>
  );
}

function PendingNewButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="admin-button" type="button" disabled title={todoVisual}>
      {children}
    </button>
  );
}

export function OrganizationSettingsPage() {
  const query = useQuery({
    queryKey: ["admin-organization"],
    queryFn: () => api<OrganizationSettings>("/api/backend/admin/organization"),
  });
  return (
    <>
      {query.isLoading && <p>Carregando...</p>}
      {query.isError && (
        <p className="inline-error">Não foi possível carregar a organização.</p>
      )}
      {query.data && <OrganizationSettingsForm organization={query.data} />}
    </>
  );
}

function UserAvatar({ user }: { user: AdminUser }) {
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className="user-avatar"
      aria-label={`Avatar de ${user.name}`}
      style={
        user.avatarUrl
          ? { backgroundImage: `url("${user.avatarUrl}")` }
          : undefined
      }
    >
      {!user.avatarUrl && initials}
    </span>
  );
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm } = useDialog();
  const { data: currentUser } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [userStatus, setUserStatus] = useState<"active" | "suspended">(
    "active",
  );
  const [mode, setMode] = useState<"list" | "create" | "edit" | "history">("list");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [profileLevel, setProfileLevel] = useState<ProfileLevel>("Nível 2");
  const [primarySectorId, setPrimarySectorId] = useState("");
  const [extraSectorIds, setExtraSectorIds] = useState<string[]>([]);
  const [cpf, setCpf] = useState("");
  const [registration, setRegistration] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phoneAreaCode, setPhoneAreaCode] = useState("");
  const [landline, setLandline] = useState("");
  const [mobile, setMobile] = useState("");
  const [canViewReports, setCanViewReports] = useState(false);
  const [emailNotificationMode, setEmailNotificationMode] = useState("SECTOR_ALL");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const openedFromQuery = useRef(false);

  const query = useQuery({
    queryKey: ["admin-users", userStatus, search],
    queryFn: () =>
      api<AdminUser[]>(
        `/api/backend/admin/users?status=${userStatus}&search=${encodeURIComponent(search)}`,
      ),
  });
  const sectors = useQuery({
    queryKey: ["admin-sectors-tree"],
    queryFn: () => api<SectorNode[]>("/api/backend/admin/sectors/tree"),
  });
  const flatSectors = sectors.data
    ? flattenTree(sortSectorTree(sectors.data)).map(({ node }) => node)
    : [];
  const canCreate = Boolean(currentUser?.permissions.includes("users.create"));
  const canManage = Boolean(currentUser?.permissions.includes("users.manage"));
  const userHistory = useQuery({
    queryKey: ["admin-user-history", selected?.id],
    queryFn: () =>
      api<{
        user: { id: string; name: string };
        items: Array<{
          id: string;
          kind: string;
          description: string;
          occurredAt: string;
          current: boolean | null;
          primary: boolean | null;
          changedBy: string | null;
        }>;
      }>(`/api/backend/admin/users/${selected!.id}/history`),
    enabled: mode === "history" && Boolean(selected),
  });

  const openCreate = () => {
    setSelected(null);
    setName("");
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setProfileLevel("Nível 2");
    setPrimarySectorId("");
    setExtraSectorIds([]);
    setCpf("");
    setRegistration("");
    setGender("");
    setBirthDate("");
    setJobTitle("");
    setPhoneAreaCode("");
    setLandline("");
    setMobile("");
    setCanViewReports(false);
    setEmailNotificationMode("SECTOR_ALL");
    setAvatarUrl("");
    setAvatarFile(null);
    setFormError("");
    setMode("create");
  };

  const openEdit = (user: AdminUser) => {
    const active = user.userSectors.filter((item) => item.active);
    const primary = active.find((item) => item.isPrimary) ?? active[0];
    setSelected(user);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setPasswordConfirm("");
    setProfileLevel(user.profileLevel);
    setPrimarySectorId(primary?.sector.id ?? "");
    setExtraSectorIds(
      active
        .map(({ sector }) => sector.id)
        .filter((id) => id !== primary?.sector.id),
    );
    setCpf(user.cpf ?? "");
    setRegistration(user.registration ?? "");
    setGender(user.gender ?? "");
    setBirthDate(user.birthDate?.slice(0, 10) ?? "");
    setJobTitle(user.jobTitle ?? "");
    setPhoneAreaCode(user.phoneAreaCode ?? "");
    setLandline(user.landline ?? "");
    setMobile(user.mobile ?? "");
    setCanViewReports(user.canViewReports ?? false);
    setEmailNotificationMode(user.emailNotificationMode ?? "SECTOR_ALL");
    setAvatarUrl(user.avatarUrl ?? "");
    setAvatarFile(null);
    setFormError("");
    setMode("edit");
  };

  const editUserId = searchParams.get("editar");
  useEffect(() => {
    if (!editUserId || openedFromQuery.current) return;
    const user = query.data?.find((item) => item.id === editUserId);
    if (user) {
      openedFromQuery.current = true;
      // A URL externa é sincronizada uma única vez com o estado do modal.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openEdit(user);
      router.replace("/admin/usuarios");
      return;
    }
    if (query.isLoading) return;
    openedFromQuery.current = true;
    void api<AdminUser>(`/api/backend/admin/users/${editUserId}`)
      .then((loaded) => {
        openEdit(loaded);
        router.replace("/admin/usuarios");
      })
      .catch(() => {
        router.replace("/admin/usuarios");
      });
  }, [editUserId, query.data, query.isLoading, router]);

  const openHistory = (user: AdminUser) => {
    setSelected(user);
    setMode("history");
  };

  const addExtraSector = (id: string) => {
    if (!id) return;
    setExtraSectorIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  };

  const sectorLabel = (id: string) => {
    const sector = flatSectors.find((item) => item.id === id);
    return sector ? `${sector.code} — ${sector.name}` : id;
  };
  const availableExtraSectors = flatSectors.filter(
    (sector) =>
      sector.id !== primarySectorId && !extraSectorIds.includes(sector.id),
  );
  const passwordMismatch =
    Boolean(password) &&
    Boolean(passwordConfirm) &&
    password !== passwordConfirm;

  const save = useMutation({
    mutationFn: async () => {
      if (!primarySectorId && extraSectorIds.length) {
        throw new ApiError("Informe a unidade principal.", 400);
      }
      if (mode === "create" || password) {
        if (!password) {
          throw new ApiError("Informe a senha.", 400);
        }
        if (password !== passwordConfirm) {
          throw new ApiError("A confirmação da senha está incorreta.", 400);
        }
      }
      const sectorIds = primarySectorId
        ? [
            primarySectorId,
            ...extraSectorIds.filter((id) => id !== primarySectorId),
          ]
        : [];
      const payload = {
        name: name.trim(),
        email: email.trim(),
        profileLevel,
        cpf: cpf.trim() || undefined,
        registration: registration.trim() || undefined,
        gender: gender || undefined,
        birthDate: birthDate || undefined,
        jobTitle: jobTitle.trim() || undefined,
        phoneAreaCode: phoneAreaCode.trim() || undefined,
        landline: landline.trim() || undefined,
        mobile: mobile.trim() || undefined,
        canViewReports,
        emailNotificationMode,
        sectors: sectorIds.map((sectorId) => ({
          sectorId,
          isPrimary: sectorId === primarySectorId,
          isManager: false,
        })),
      };
      if (mode === "create") {
        const saved = await api<AdminUser>("/api/backend/admin/users", {
          method: "POST",
          body: JSON.stringify({ ...payload, password }),
        });
        if (avatarFile) await uploadUserAvatar(saved.id, avatarFile);
        return saved;
      }
      const saved = await api<AdminUser>(`/api/backend/admin/users/${selected!.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...payload,
          ...(password ? { password } : {}),
        }),
      });
      if (avatarFile) await uploadUserAvatar(saved.id, avatarFile);
      return saved;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setMode("list");
      setSelected(null);
    },
    onError: (error) =>
      setFormError(
        error instanceof ApiError ? error.message : "Falha ao salvar.",
      ),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api(`/api/backend/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  if (mode === "history" && selected) {
    return (
      <section className="admin-user-history" aria-label={`Histórico de ${selected.name}`}>
        <AdminBackButton onClick={() => { setMode("list"); setSelected(null); }}>
          Voltar às pessoas usuárias
        </AdminBackButton>
        <AdminTitle icon={<History size={18} />} subtitle="Histórico de alterações de acesso desde o cadastro">
          Carreira de {selected.name}
        </AdminTitle>
        {userHistory.isLoading && <p>Carregando histórico...</p>}
        {userHistory.isError && <p className="inline-error">Não foi possível carregar o histórico.</p>}
        {userHistory.data && (
          <HierarchyTable>
            <table className="admin-data-table user-history-table">
              <thead><tr><th>Alteração</th><th>Data/hora</th><th>Atual</th><th>Principal</th><th>Alterado por</th></tr></thead>
              <tbody>
                {userHistory.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{new Date(item.occurredAt).toLocaleString("pt-BR")}</td>
                    <td>{item.current === true ? "Atualmente nesta unidade" : item.current === false ? "Histórico" : "—"}</td>
                    <td>{item.primary === true ? "Unidade principal" : "—"}</td>
                    <td>{item.changedBy ?? "Sistema"}</td>
                  </tr>
                ))}
                {!userHistory.data.items.length && <tr><td colSpan={5} className="empty-row">Nenhuma alteração registrada.</td></tr>}
              </tbody>
            </table>
          </HierarchyTable>
        )}
      </section>
    );
  }

  if (mode === "create" || mode === "edit") {
    return (
      <section
        className="admin-user-form"
        aria-label={
          mode === "create" ? "Adicionar pessoa" : "Editar pessoa usuária"
        }
      >
        <AdminBackButton
          onClick={() => {
            setMode("list");
            setSelected(null);
            setFormError("");
          }}
        >
          Voltar às pessoas usuárias
        </AdminBackButton>
        <AdminTitle
          icon={<UsersRound size={18} />}
          subtitle="Defina os dados de acesso, o perfil e as unidades de atuação."
        >
          {mode === "create" ? "Nova pessoa usuária" : "Editar pessoa usuária"}
        </AdminTitle>
        <form
          className="admin-entity-form"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <label>
            <span className="field-label">
              Nome<em aria-hidden>*</em>
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="field-label">CPF</span>
            <input value={cpf} onChange={(event) => setCpf(event.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
          </label>
          <label>
            <span className="field-label">Matrícula</span>
            <input value={registration} onChange={(event) => setRegistration(event.target.value)} />
          </label>
          <label>
            <span className="field-label">Sexo</span>
            <FilterPillSelect
              label="Sexo"
              hideLabel
              value={gender}
              className="sd-pill-select"
              placeholder="- selecione -"
              onChange={setGender}
              options={[
                { value: "", label: "- selecione -" },
                { value: "FEMALE", label: "Feminino" },
                { value: "MALE", label: "Masculino" },
                { value: "OTHER", label: "Outro" },
                { value: "NOT_INFORMED", label: "Prefiro não informar" },
              ]}
            />
          </label>
          <label>
            <span className="field-label">Data de nascimento</span>
            <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
          </label>
          <label>
            <span className="field-label">Função atual</span>
            <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
          </label>
          <div className="admin-phone-fields">
            <label>
              <span className="field-label">DDD</span>
              <input value={phoneAreaCode} onChange={(event) => setPhoneAreaCode(event.target.value)} inputMode="numeric" maxLength={3} />
            </label>
            <label>
              <span className="field-label">Ramal/Telefone fixo</span>
              <input value={landline} onChange={(event) => setLandline(event.target.value)} inputMode="tel" />
            </label>
            <label>
              <span className="field-label">Celular</span>
              <input value={mobile} onChange={(event) => setMobile(event.target.value)} inputMode="tel" />
            </label>
          </div>
          <label>
            <span className="field-label">
              E-mail<em aria-hidden>*</em>
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="field-label">
              Senha
              {mode === "create" ? <em aria-hidden>*</em> : " (opcional)"}
            </span>
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required={mode === "create"}
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label>
            <span className="field-label">
              Confirmação
              {mode === "create" || password ? <em aria-hidden>*</em> : null}
            </span>
            <PasswordInput
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              required={mode === "create" || Boolean(password)}
              minLength={password ? 8 : undefined}
              autoComplete="new-password"
              aria-invalid={passwordMismatch || undefined}
            />
            {passwordMismatch && (
              <span className="field-error" role="alert">
                A confirmação da senha está incorreta
              </span>
            )}
          </label>
          <label>
            <span className="field-label">
              Perfil<em aria-hidden>*</em>
            </span>
            <FilterPillSelect
              label="Perfil"
              hideLabel
              required
              value={profileLevel}
              className="sd-pill-select"
              onChange={(next) => setProfileLevel(next as ProfileLevel)}
              options={(
                [
                  "Administrador",
                  "Nível 1",
                  "Nível 2",
                  "Nível 3",
                ] as ProfileLevel[]
              ).map((level) => ({ value: level, label: level }))}
            />
          </label>
          <label>
            <span className="field-label">Unidade principal</span>
            <FilterPillSelect
              label="Unidade principal"
              hideLabel
              searchable
              searchPlaceholder="Buscar por sigla ou nome"
              value={primarySectorId}
              className="sd-pill-select"
              placeholder="Disponível — sem unidade"
              onChange={(next) => {
                setPrimarySectorId(next);
                setExtraSectorIds((current) =>
                  current.filter((id) => id !== next),
                );
              }}
              options={[
                { value: "", label: "Disponível — sem unidade" },
                ...flatSectors.map((sector) => ({
                  value: sector.id,
                  label: `${sector.code} — ${sector.name}`,
                })),
              ]}
            />
            <small>
              Sem unidade, a pessoa fica disponível até ser incluída em uma
              unidade.
            </small>
          </label>
          <div className="sector-extra-field">
            <label>
              Unidades adicionais
              <FilterPillSelect
                label="Unidades adicionais"
                hideLabel
                searchable
                searchPlaceholder="Buscar por sigla ou nome"
                value=""
                className="sd-pill-select"
                disabled={!primarySectorId || !availableExtraSectors.length}
                placeholder={
                  availableExtraSectors.length
                    ? "Selecione para adicionar"
                    : "Todas as unidades já adicionadas"
                }
                onChange={addExtraSector}
                options={[
                  {
                    value: "",
                    label: availableExtraSectors.length
                      ? "Selecione para adicionar"
                      : "Todas as unidades já adicionadas",
                  },
                  ...availableExtraSectors.map((sector) => ({
                    value: sector.id,
                    label: `${sector.code} — ${sector.name}`,
                  })),
                ]}
              />
            </label>
            {!!extraSectorIds.length && (
              <ul className="sector-chip-list">
                {extraSectorIds.map((id) => (
                  <li key={id}>
                    <span>{sectorLabel(id)}</span>
                    <button
                      type="button"
                      aria-label={`Remover ${sectorLabel(id)}`}
                      onClick={() =>
                        setExtraSectorIds((current) =>
                          current.filter((item) => item !== id),
                        )
                      }
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <label className="admin-checkbox-field">
            <input type="checkbox" checked={canViewReports} onChange={(event) => setCanViewReports(event.target.checked)} />
            Pode visualizar relatórios, estatísticas gerais e mapa
          </label>
          <label>
            <span className="field-label">Foto</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 20 * 1024 * 1024) {
                  setFormError("A foto deve ter no máximo 20 MB.");
                  return;
                }
                setAvatarFile(file);
                setFormError("");
              }}
            />
            {(avatarFile || avatarUrl) && <span className="field-help">{avatarFile ? "Nova foto selecionada" : "Foto atual cadastrada"}</span>}
          </label>
          <fieldset className="admin-notification-fieldset">
            <legend>Avisos por e-mail</legend>
            <label>
              <input
                type="checkbox"
                checked={emailNotificationMode === "NONE"}
                onChange={(event) =>
                  setEmailNotificationMode(
                    event.target.checked ? "NONE" : "SECTOR_ALL",
                  )
                }
              />
              Não desejo receber e-mail
            </label>
          </fieldset>
          {formError && (
            <p className="inline-error" role="alert">
              {formError}
            </p>
          )}
          <div className="admin-form-actions">
            <button
              className="admin-button"
              type="submit"
              disabled={save.isPending}
            >
              Salvar
            </button>
            <button
              className="admin-button secondary"
              type="button"
              onClick={() => setMode("list")}
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <>
      <AdminTitle icon={<UsersRound size={18} />}>
        Pessoas usuárias{" "}
        <span>· {userStatus === "active" ? "ativas" : "suspensas"}</span>
      </AdminTitle>
      <p className="admin-count">{query.data?.length ?? 0} pessoas usuárias.</p>
      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchLabel="Buscar pessoas usuárias"
        actions={
          <>
          <button
            type="button"
            disabled={!canCreate}
            onClick={openCreate}
          >
            Adicionar pessoa
          </button>
          <FilterPillSelect
            label="Situação das pessoas usuárias"
            hideLabel
            value={userStatus}
            className="sd-pill-select admin-toolbar-pill"
            onChange={(next) =>
              setUserStatus(next as "active" | "suspended")
            }
            options={[
              { value: "active", label: "Ativas" },
              { value: "suspended", label: "Suspensas" },
            ]}
          />
          </>
        }
      />
      <HierarchyTable>
        <table className="admin-data-table users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Pessoa usuária</th>
              <th>Unidades</th>
              <th>Perfil</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((user) => (
              <tr key={user.id}>
                <td>{user.id.slice(0, 8)}</td>
                <td>
                  <div className="admin-user-cell">
                    <UserAvatar user={user} />
                    <span>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </span>
                  </div>
                </td>
                <td>
                  <div className="chips">
                    {user.userSectors.filter((item) => item.active).length
                      ? user.userSectors
                          .filter((item) => item.active)
                          .map(({ sector }) => (
                            <span
                              className="sector-chip"
                              key={sector.id}
                              title={sector.name}
                            >
                              {sector.code}
                            </span>
                          ))
                      : "Disponível"}
                  </div>
                </td>
                <td>{user.profileLevel}</td>
                <td>
                  <div className="compact-admin-actions">
                    <button type="button" aria-label={`Histórico de ${user.name}`} title="Carreira" onClick={() => openHistory(user)}>
                      <History size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={!canManage}
                      aria-label={`Editar ${user.name}`}
                      onClick={() => openEdit(user)}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={!canManage}
                      aria-label={`${userStatus === "active" ? "Suspender" : "Reativar"} ${user.name}`}
                      onClick={() => {
                        const action =
                          userStatus === "active" ? "Suspender" : "Reativar";
                        void (async () => {
                          const ok = await confirm({
                            title: `${action} pessoa usuária`,
                            message: `${action} ${user.name}?`,
                            confirmLabel: action,
                            cancelLabel: "Cancelar",
                            tone:
                              userStatus === "active" ? "danger" : "default",
                          });
                          if (!ok) return;
                          changeStatus.mutate({
                            id: user.id,
                            active: userStatus !== "active",
                          });
                        })();
                      }}
                    >
                      {userStatus === "active" ? <Ban size={16} /> : "Ativar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!query.data?.length && (
              <tr>
                <td colSpan={5} className="empty-row">
                  Nenhuma pessoa usuária ativa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </HierarchyTable>
      <PaginationCompact />
    </>
  );
}

export function TaxonomyPage({ kind }: { kind: "subject" | "type" }) {
  const [context, setContext] = useState("general");
  const [showCount, setShowCount] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const contexts = useQuery({
    queryKey: ["admin-taxonomy-contexts"],
    queryFn: () =>
      api<TaxonomyContext[]>("/api/backend/admin/taxonomy-contexts"),
  });
  const endpoint = kind === "subject" ? "subjects" : "types";
  const query = useQuery({
    queryKey: ["admin-taxonomy", kind, context, showCount],
    queryFn: () =>
      api<TaxonomyNode[]>(
        `/api/backend/admin/${endpoint}?context=${encodeURIComponent(context)}&status=active&showCount=${showCount}`,
      ),
  });
  const selected =
    contexts.data?.find((item) => item.key === context)?.name ??
    "Institucional";
  const filter = (nodes: TaxonomyNode[]): TaxonomyNode[] =>
    nodes.flatMap((node) => {
      const children = filter(node.children);
      return node.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")) || children.length
        ? [{ ...node, children }]
        : [];
    });
  const shown = search ? filter(query.data ?? []) : (query.data ?? []);
  const total = flattenTree(query.data ?? []).length;
  const isSubject = kind === "subject";
  return (
    <>
      <AdminTitle
        icon={isSubject ? <FolderTree size={18} /> : <FileType2 size={18} />}
      >
        {isSubject ? "Categorias" : "Classificações"}{" "}
        <span>({selected}) · ativas</span>
      </AdminTitle>
      <p className="admin-count">
        {total} {isSubject ? "categoria(s)" : "classificação(ões)"}.
      </p>
      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchLabel="Buscar cadastros"
        actions={
          <>
          <AdminTaxonomyContextDropdown
            contexts={contexts.data ?? []}
            value={context}
            onChange={setContext}
          />
          <PendingNewButton>
            {isSubject ? "Adicionar categoria" : "Adicionar classificação"}
          </PendingNewButton>
          <AdminCountToggle checked={showCount} onChange={setShowCount} />
          <AdminListDropdown />
          </>
        }
      />
      <TaxonomyTable items={shown} kind={kind} showCount={showCount} />
      <PaginationCompact />
    </>
  );
}

type MarkerFormValues = {
  name: string;
  color: string;
  parentMarkerId: string | null;
};

export function MarkerEditorForm({
  marker,
  markers,
  sector,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  marker: MarkerNode | null;
  markers: MarkerNode[];
  sector: SectorNode;
  pending: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (values: MarkerFormValues) => void;
}) {
  const [name, setName] = useState(marker?.name ?? "");
  const [color, setColor] = useState(marker?.color ?? "#15616D");
  const [parentMarkerId, setParentMarkerId] = useState(marker?.parentId ?? "");
  const excludedIds = new Set(
    marker ? flattenTree([marker]).map(({ node }) => node.id) : [],
  );
  const parentOptions = flattenTree(markers).filter(
    ({ node }) => !excludedIds.has(node.id),
  );

  return (
    <section className="sd-create-page" aria-label="Cadastro de etiqueta">
      <AdminBackButton onClick={onCancel}>Voltar às etiquetas</AdminBackButton>
      <header className="sd-create-header">
        <span>Organização documental</span>
        <h1>{marker ? "Editar etiqueta" : "Nova etiqueta"}</h1>
        <p>
          Crie uma identificação visual para organizar documentos da unidade{" "}
          {sector.code} — {sector.name}.
        </p>
      </header>
      <form
        className="sd-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            name: name.trim(),
            color,
            parentMarkerId: parentMarkerId || null,
          });
        }}
      >
        <fieldset className="sd-form-section">
          <legend>
            <span>01</span>
            Identificação
          </legend>
          <p>Defina um nome objetivo e uma cor fácil de reconhecer.</p>
          <div className="sd-form-grid">
            <label className="sd-field">
              Nome da etiqueta *
              <input
                required
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="sd-field">
              Cor *
              <span className="marker-color-field">
                <input
                  aria-label="Selecionar cor"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
                <output>{color.toUpperCase()}</output>
              </span>
            </label>
            <label className="sd-field sd-field-full">
              Etiqueta superior
              <FilterPillSelect
                label="Etiqueta superior"
                hideLabel
                searchable
                searchPlaceholder="Buscar por sigla ou nome"
                value={parentMarkerId}
                className="sd-pill-select"
                placeholder="Nenhuma — nível principal"
                onChange={setParentMarkerId}
                options={[
                  { value: "", label: "Nenhuma — nível principal" },
                  ...parentOptions.map(({ node, depth }) => ({
                    value: node.id,
                    label: `${"\u00A0".repeat(depth * 2)}${node.name}`,
                  })),
                ]}
              />
              <small>
                Opcional. Use para agrupar etiquetas relacionadas em uma
                hierarquia.
              </small>
            </label>
          </div>
        </fieldset>
        {error && (
          <p className="sd-form-error" role="alert">
            {error}
          </p>
        )}
        <footer className="sd-form-actions">
          <button className="admin-button" type="submit" disabled={pending}>
            {pending
              ? "Salvando…"
              : marker
                ? "Salvar alterações"
                : "Criar etiqueta"}
          </button>
          <button
            className="light-button"
            type="button"
            onClick={onCancel}
            disabled={pending}
          >
            Cancelar
          </button>
        </footer>
      </form>
    </section>
  );
}

export function MarkersPage() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [showCount, setShowCount] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [editing, setEditing] = useState<MarkerNode | "new" | null>(null);
  const [formError, setFormError] = useState("");
  const sectors = useQuery({
    queryKey: ["admin-sectors-tree"],
    queryFn: () => api<SectorNode[]>("/api/backend/admin/sectors/tree"),
  });
  const primaryId = currentUser?.userSectors.find((item) => item.isPrimary)
    ?.sector.id;
  const sectorRows = sectors.data
    ? flattenTree(sortSectorTree(sectors.data)).map(({ node }) => node)
    : [];
  const sectorId = primaryId ?? sectorRows[0]?.id ?? "";
  const sector = sectorRows.find((item) => item.id === sectorId);
  const query = useQuery({
    queryKey: ["admin-markers", sectorId, showCount],
    queryFn: () =>
      api<MarkerNode[]>(
        `/api/backend/admin/markers?sectorId=${sectorId}&status=active&showCount=${showCount}`,
      ),
    enabled: Boolean(sectorId),
  });
  const canManage = Boolean(
    currentUser?.permissions.includes("markers.manage"),
  );
  const saveMarker = useMutation({
    mutationFn: async (values: {
      name: string;
      color: string;
      parentMarkerId: string | null;
    }) => {
      const isNew = editing === "new";
      return api(
        isNew
          ? "/api/backend/admin/markers"
          : `/api/backend/admin/markers/${editing?.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          body: JSON.stringify({
            ...values,
            ...(isNew ? { sectorId } : {}),
            parentMarkerId: values.parentMarkerId || null,
          }),
        },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-markers"] });
      setEditing(null);
      setFormError("");
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar a etiqueta.",
      );
    },
  });
  const total = query.data ? flattenTree(query.data).length : 0;

  if (editing && sector) {
    return (
      <MarkerEditorForm
        key={editing === "new" ? "new" : editing.id}
        marker={editing === "new" ? null : editing}
        markers={query.data ?? []}
        sector={sector}
        pending={saveMarker.isPending}
        error={formError}
        onCancel={() => {
          setEditing(null);
          setFormError("");
        }}
        onSubmit={(values) => saveMarker.mutate(values)}
      />
    );
  }

  return (
    <>
      <AdminTitle icon={<Tag size={18} />}>
        Etiquetas <span>· ativas</span>
      </AdminTitle>
      <p className="marker-sector-context">
        {sector ? `${sector.code} - ${sector.name}` : "Unidade atual"}
      </p>
      <p className="admin-count">{total} etiqueta(s).</p>
      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchLabel="Buscar etiquetas"
        actions={
          <>
          <button
            type="button"
            disabled={!canManage || !sectorId}
            onClick={() => {
              setFormError("");
              setEditing("new");
            }}
          >
            Adicionar etiqueta
          </button>
          <AdminCountToggle checked={showCount} onChange={setShowCount} />
          <AdminListDropdown />
          </>
        }
      />
      {query.isError && (
        <p className="inline-error">
          Não foi possível carregar as etiquetas da unidade atual.
        </p>
      )}
      <MarkerHierarchy
        markers={filterMarkerTree(query.data ?? [], search)}
        showCount={showCount}
        onEdit={
          canManage
            ? (marker) => {
                setFormError("");
                setEditing(marker);
              }
            : undefined
        }
      />
      <PaginationCompact />
    </>
  );
}

export function AdminPage({ section }: { section: string }) {
  return (
    <section className="admin-container">
      <div className="admin-content">
        {section === "configuracoes" && <OrganizationSettingsPage />}
        {section === "setores" && <SectorsPage />}
        {section === "usuarios" && <UsersPage />}
        {section === "assuntos" && <SubjectsPage />}
        {section === "marcadores" && <MarkersPage />}
        {section === "nomes-arquivo" && <FileNamesPage />}
      </div>
    </section>
  );
}
