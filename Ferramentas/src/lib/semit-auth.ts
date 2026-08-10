export type SemitUser = { id: string; name?: string; email?: string; role: string };

const ADMIN_ROLES = new Set(["admin", "admin-votacao", "admin-semit"]);

export function isSemitAdmin(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return ADMIN_ROLES.has(r) || r.startsWith("admin");
}

export async function requireSemitAdmin(request: Request): Promise<SemitUser> {
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    const err = new Error("Faça login como administrador SEMIT.");
    (err as any).status = 401;
    throw err;
  }
  const apiBase = (process.env.API_INTERNAL_URL || "http://api:5000").replace(/\/$/, "");
  const res = await fetch(`${apiBase}/api/users/checkuser`, {
    headers: { Authorization: auth, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = new Error("Sessão inválida ou expirada.");
    (err as any).status = 401;
    throw err;
  }
  const body = await res.json();
  const user = (body.user || body) as Record<string, unknown>;
  const role = String(user.role || "");
  if (!isSemitAdmin(role)) {
    const err = new Error("Apenas administradores podem alterar ramais.");
    (err as any).status = 403;
    throw err;
  }
  return {
    id: String(user._id || user.id || ""),
    name: user.name ? String(user.name) : undefined,
    email: user.email ? String(user.email) : undefined,
    role,
  };
}
