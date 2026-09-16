import os

# 1. Patch apps/api/src/admin/organization/organization.controller.ts
org_ctrl_path = '/home/semit/Documentos/sd_docs/apps/api/src/admin/organization/organization.controller.ts'
if os.path.exists(org_ctrl_path):
    with open(org_ctrl_path, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } })',
                  'FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } })')
    with open(org_ctrl_path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Patched organization.controller.ts")

# 2. Patch apps/api/src/admin/organization/organization.service.ts
org_srv_path = '/home/semit/Documentos/sd_docs/apps/api/src/admin/organization/organization.service.ts'
if os.path.exists(org_srv_path):
    with open(org_srv_path, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('const MAX_BRANDING_ASSET_BYTES = 2 * 1024 * 1024;',
                  'const MAX_BRANDING_ASSET_BYTES = 20 * 1024 * 1024;')
    c = c.replace('"Arquivo deve ter no máximo 2 MB"',
                  '"Arquivo deve ter no máximo 20 MB"')
    c = c.replace('`/public/branding/cover?organizationId=',
                  '`/docs/public/branding/cover?organizationId=')
    c = c.replace('`/public/branding/asset?organizationId=',
                  '`/docs/public/branding/asset?organizationId=')
    with open(org_srv_path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Patched organization.service.ts")

# 3. Patch apps/api/src/branding/branding.service.ts
br_srv_path = '/home/semit/Documentos/sd_docs/apps/api/src/branding/branding.service.ts'
if os.path.exists(br_srv_path):
    with open(br_srv_path, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('`/public/branding/asset?organizationId=',
                  '`/docs/public/branding/asset?organizationId=')
    with open(br_srv_path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Patched branding.service.ts")

# 4. Patch apps/web/src/lib/branding.ts
br_web_path = '/home/semit/Documentos/sd_docs/apps/web/src/lib/branding.ts'
if os.path.exists(br_web_path):
    with open(br_web_path, 'r', encoding='utf-8') as f:
        c = f.read()
    old_base_fn = '''function withDocsBasePath(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/logos/") ? `/docs${url}` : url;
}'''
    new_base_fn = '''function withDocsBasePath(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/docs/")) return url;
  if (url.startsWith("/logos/") || url.startsWith("/public/")) return `/docs${url}`;
  return url;
}'''
    if old_base_fn in c:
        c = c.replace(old_base_fn, new_base_fn)
        print("Patched withDocsBasePath in branding.ts")
    with open(br_web_path, 'w', encoding='utf-8') as f:
        f.write(c)

# 5. Patch apps/web/src/components/admin.tsx
admin_path = '/home/semit/Documentos/sd_docs/apps/web/src/components/admin.tsx'
if os.path.exists(admin_path):
    with open(admin_path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Add resolveBrandingUrl helper and 20MB limit
    old_upload_code = '''function OrganizationLogoUpload({
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
      ? "PNG ou ICO; máximo de 2 MB."
      : kind === "header"
        ? "PNG, JPEG ou WebP; máximo de 2 MB."
        : "PNG, JPEG, WebP ou SVG; máximo de 2 MB.";'''

    new_upload_code = '''function resolveBrandingUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.startsWith("/docs/")) return url;
  if (url.startsWith("/")) return `/docs${url}`;
  return `/docs/${url}`;
}

function OrganizationLogoUpload({
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
      ? "PNG ou ICO; máximo de 20 MB."
      : kind === "header"
        ? "PNG, JPEG ou WebP; máximo de 20 MB."
        : "PNG, JPEG, WebP ou SVG; máximo de 20 MB.";'''

    if old_upload_code in c:
        c = c.replace(old_upload_code, new_upload_code)
        print("Patched OrganizationLogoUpload header and help text in admin.tsx")

    c = c.replace('formatHelp.replace("; máximo de 2 MB.", "")', 'formatHelp.replace("; máximo de 20 MB.", "")')
    c = c.replace('if (file.size === 0 || file.size > 2 * 1024 * 1024) {', 'if (file.size === 0 || file.size > 20 * 1024 * 1024) {')
    c = c.replace('setError("A imagem deve ter entre 1 byte e 2 MB.");', 'setError("A imagem deve ter entre 1 byte e 20 MB.");')

    old_img = '''        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt="Pré-visualização da logo atual"
            style={{ height, width: width ?? "auto" }}
          />
        ) : ('''

    new_img = '''        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveBrandingUrl(currentUrl) ?? currentUrl}
            alt="Pré-visualização da logo atual"
            style={{ height, width: width ?? "auto" }}
          />
        ) : ('''

    if old_img in c:
        c = c.replace(old_img, new_img)
        print("Patched logo preview img in admin.tsx")

    with open(admin_path, 'w', encoding='utf-8') as f:
        f.write(c)

print("Branding patch complete!")
