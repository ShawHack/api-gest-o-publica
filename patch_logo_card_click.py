import os

admin_path = '/home/semit/Documentos/sd_docs/apps/web/src/components/admin.tsx'
if os.path.exists(admin_path):
    with open(admin_path, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Update imports
    if "ImagePlus" not in c:
        c = c.replace(
            '  UsersRound,\n  X,',
            '  UsersRound,\n  Upload,\n  ImagePlus,\n  X,'
        )
        print("Added ImagePlus, Upload to imports in admin.tsx")

    # 2. Update OrganizationLogoUpload
    old_uploader = '''function OrganizationLogoUpload({
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
        : "PNG, JPEG, WebP ou SVG; máximo de 20 MB.";
  return (
    <div className="logo-upload">
      <label>
        {kind === "favicon"
          ? "Favicon"
          : `Logo ${kind === "ui" ? "do sistema" : kind === "header" ? "da Prefeitura no cabeçalho" : "do login"}`}
      </label>
      <input
        type="file"
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
            setError(`Use ${formatHelp.replace("; máximo de 20 MB.", "")}.`);
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
      <small>{formatHelp}</small>'''

    new_uploader = '''function OrganizationLogoUpload({
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
    <div className="logo-upload">
      <label>
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
        style={{ width: "100%", margin: "4px 0", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus size={16} />
        {uploading ? "Enviando…" : "Escolher foto / arquivo"}
      </button>
      <small>{formatHelp}</small>'''

    if old_uploader in c:
        c = c.replace(old_uploader, new_uploader)
        print("Replaced OrganizationLogoUpload in admin.tsx")
    else:
        print("Could not find exact old_uploader block in admin.tsx, checking variants...")
        # Check if already patched or partial
        c = c.replace('const [uploading, setUploading] = useState(false);', 'const fileInputRef = useRef<HTMLInputElement>(null);\n  const [uploading, setUploading] = useState(false);')
        c = c.replace('<input\n        type="file"', '<input\n        ref={fileInputRef}\n        type="file"\n        style={{ display: "none" }}')
        button_code = '''<button
        type="button"
        className="admin-action-add"
        style={{ width: "100%", margin: "4px 0", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus size={16} />
        {uploading ? "Enviando…" : "Escolher foto / arquivo"}
      </button>'''
        if button_code not in c:
            c = c.replace('<small>{formatHelp}</small>', button_code + '\n      <small>{formatHelp}</small>')
            print("Injected button and ref into admin.tsx")

    with open(admin_path, 'w', encoding='utf-8') as f:
        f.write(c)

print("Patch logo card click complete!")
