import os
import re

print("=== APPLYING COMPLETE BRANDING & CARD FIXES ===")

# 1. Patch apps/api/src/admin/organization/organization.dto.ts
dto_path = '/home/semit/Documentos/sd_docs/apps/api/src/admin/organization/organization.dto.ts'
if os.path.exists(dto_path):
    with open(dto_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Make sure IsOptional is imported
    if "IsOptional," not in content and "IsOptional" not in content:
        content = content.replace('import {\n  ArrayMaxSize,', 'import {\n  IsOptional,\n  ArrayMaxSize,')
        content = content.replace('import { ArrayMaxSize,', 'import { IsOptional, ArrayMaxSize,')
    elif "IsOptional" not in content:
        content = re.sub(r'import \{([^}]+)\} from "class-validator";', r'import { IsOptional,\1} from "class-validator";', content)

    # Patch BrandingAssetQueryDto
    old_asset_dto = '''export class BrandingAssetQueryDto {
  @IsString()
  organizationId: string;

  @IsIn(["ui", "header", "login", "favicon"])
  kind: "ui" | "header" | "login" | "favicon";

  @IsString()
  hostname: string;
}'''

    new_asset_dto = '''export class BrandingAssetQueryDto {
  @IsString()
  organizationId: string;

  @IsIn(["ui", "header", "login", "favicon"])
  kind: "ui" | "header" | "login" | "favicon";

  @IsOptional()
  @IsString()
  hostname?: string;
}'''

    old_cover_dto = '''export class BrandingCoverQueryDto {
  @IsString()
  organizationId: string;

  @IsString()
  coverId: string;

  @IsString()
  hostname: string;
}'''

    new_cover_dto = '''export class BrandingCoverQueryDto {
  @IsString()
  organizationId: string;

  @IsString()
  coverId: string;

  @IsOptional()
  @IsString()
  hostname?: string;
}'''

    content = content.replace(old_asset_dto, new_asset_dto)
    content = content.replace(old_cover_dto, new_cover_dto)

    # Also handle partial replacement if needed
    content = re.sub(
        r'export class BrandingAssetQueryDto \{[\s\S]*?@IsString\(\)\s+hostname:\s*string;\s*\}',
        new_asset_dto,
        content
    )
    content = re.sub(
        r'export class BrandingCoverQueryDto \{[\s\S]*?@IsString\(\)\s+hostname:\s*string;\s*\}',
        new_cover_dto,
        content
    )

    with open(dto_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched organization.dto.ts")


# 2. Patch apps/api/src/branding/branding.service.ts
branding_srv_path = '/home/semit/Documentos/sd_docs/apps/api/src/branding/branding.service.ts'
if os.path.exists(branding_srv_path):
    with open(branding_srv_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Update assetUrl to use /docs/api/backend/public/branding/asset
    content = re.sub(
        r'\/docs\/public\/branding\/asset\?organizationId=',
        r'/docs/api/backend/public/branding/asset?organizationId=',
        content
    )

    # Update openPublicAsset to accept optional hostname
    old_open_asset = '''  async openPublicAsset(
    organizationId: string,
    kind: BrandingAssetKind,
    hostname: string,
  ) {
    const tenant = await this.tenants.resolveByHostname(hostname);
    if (tenant.organization.id !== organizationId) {
      throw new NotFoundException("Asset não encontrado");
    }'''

    new_open_asset = '''  async openPublicAsset(
    organizationId: string,
    kind: BrandingAssetKind,
    hostname?: string,
  ) {
    if (hostname) {
      const tenant = await this.tenants.resolveByHostname(hostname);
      if (tenant.organization.id !== organizationId) {
        throw new NotFoundException("Asset não encontrado");
      }
    }'''

    content = content.replace(old_open_asset, new_open_asset)

    # Update openPublicCover to accept optional hostname
    old_open_cover = '''  async openPublicCover(
    organizationId: string,
    coverId: string,
    hostname: string,
  ) {
    const tenant = await this.tenants.resolveByHostname(hostname);
    if (tenant.organization.id !== organizationId) {
      throw new NotFoundException("Capa não encontrada");
    }'''

    new_open_cover = '''  async openPublicCover(
    organizationId: string,
    coverId: string,
    hostname?: string,
  ) {
    if (hostname) {
      const tenant = await this.tenants.resolveByHostname(hostname);
      if (tenant.organization.id !== organizationId) {
        throw new NotFoundException("Capa não encontrada");
      }
    }'''

    content = content.replace(old_open_cover, new_open_cover)

    with open(branding_srv_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched branding.service.ts")


# 3. Patch apps/api/src/admin/organization/organization.service.ts
org_srv_path = '/home/semit/Documentos/sd_docs/apps/api/src/admin/organization/organization.service.ts'
if os.path.exists(org_srv_path):
    with open(org_srv_path, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace(
        '/docs/public/branding/asset?organizationId=',
        '/docs/api/backend/public/branding/asset?organizationId='
    )
    content = content.replace(
        '/docs/public/branding/cover?organizationId=',
        '/docs/api/backend/public/branding/cover?organizationId='
    )

    with open(org_srv_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched organization.service.ts")


# 4. Patch apps/web/src/components/admin.tsx
admin_path = '/home/semit/Documentos/sd_docs/apps/web/src/components/admin.tsx'
if os.path.exists(admin_path):
    with open(admin_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Ensure icons import
    if "ImagePlus" not in content or "Upload" not in content:
        content = re.sub(
            r'import \{([^}]+)\} from "lucide-react";',
            lambda m: f'import {{{m.group(1)}, ImagePlus, Upload}} from "lucide-react";' if "ImagePlus" not in m.group(1) else m.group(0),
            content
        )

    # Make sure OrganizationLogoUpload is exported and has a clean, full-card clickable UI
    new_org_logo_upload = '''export function OrganizationLogoUpload({
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
}'''

    # Replace OrganizationLogoUpload function
    content = re.sub(
        r'(?:export\s+)?function\s+OrganizationLogoUpload\s*\([\s\S]*?^}\n\nexport function OrganizationSettingsForm',
        new_org_logo_upload + '\n\nexport function OrganizationSettingsForm',
        content,
        flags=re.MULTILINE
    )

    with open(admin_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched admin.tsx")

print("=== ALL PATCHES COMPLETE ===")
