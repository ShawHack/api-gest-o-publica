const DANGEROUS_EXT = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "ps1",
  "vbs",
  "js",
  "jar",
  "dll",
  "sh",
  "php",
  "phtml",
  "asp",
  "aspx",
  "html",
  "htm",
  "svgz",
]);

export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || "arquivo";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^\w.\- ()[\]]+/gi, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 180);

  return cleaned || "arquivo";
}

export function extensionOf(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

export function isDangerousFileName(name: string): boolean {
  const ext = extensionOf(name);
  if (DANGEROUS_EXT.has(ext)) return true;
  // Double extension tricks: foto.jpg.exe
  const lower = name.toLowerCase();
  return /\.(exe|bat|cmd|js|php|html|htm)(\.|$)/i.test(lower) && !/\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif|ico|svg)$/i.test(lower);
}

export function buildOutputFileName(original: string, ext: string): string {
  const safe = sanitizeFileName(original);
  const withoutExt = safe.replace(/\.[^.]+$/, "") || "convertido";
  return `${withoutExt}.${ext}`;
}
