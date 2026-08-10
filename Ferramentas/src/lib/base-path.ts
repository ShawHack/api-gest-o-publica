export const BASE_PATH = "/ferramentas";

export function withBasePath(path: string): string {
  if (!path) return BASE_PATH || "/";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}
