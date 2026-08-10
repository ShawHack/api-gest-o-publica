"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import styles from "./RamaisSearch.module.css";

type RamalEntry = {
  id?: string;
  ramal: string;
  nomeSetor: string;
};

type AdminUser = {
  id: string;
  name?: string;
  email?: string;
  role: string;
};

const TOKEN_KEY = "semit_admin_token";
const PUBLIC_API = "https://api.garca.sp.gov.br";

function whatsappShareUrl(entry: RamalEntry): string {
  const text = [
    "📞 *Ramal MITI*",
    `Ramal: ${entry.ramal}`,
    `Nome/Setor: ${entry.nomeSetor}`,
  ].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function readStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const fromSession = sessionStorage.getItem(TOKEN_KEY);
    if (fromSession) return fromSession;
    const fromLocal =
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      "";
    if (fromLocal) {
      sessionStorage.setItem(TOKEN_KEY, fromLocal);
      return fromLocal;
    }
  } catch {
    /* ignore storage errors */
  }
  return "";
}

function saveToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export default function RamaisSearch() {
  const [ramal, setRamal] = useState("");
  const [nomeSetor, setNomeSetor] = useState("");
  const [items, setItems] = useState<RamalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adminOpen, setAdminOpen] = useState(false);
  const [token, setToken] = useState("");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [pasteToken, setPasteToken] = useState("");

  const [newRamal, setNewRamal] = useState("");
  const [newNome, setNewNome] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRamal, setEditRamal] = useState("");
  const [editNome, setEditNome] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (ramal.trim()) params.set("ramal", ramal.trim());
    if (nomeSetor.trim()) params.set("nome", nomeSetor.trim());
    return params.toString();
  }, [ramal, nomeSetor]);

  const fetchRamais = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const path = query ? `/api/ramais?${query}` : "/api/ramais";
      const res = await fetch(withBasePath(path), { signal });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: RamalEntry[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setItems([]);
        setError(data.error || "Não foi possível carregar os ramais.");
        return;
      }
      setItems(data.items || []);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setItems([]);
      setError("Falha de comunicação ao buscar ramais.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchRamais(controller.signal);
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [fetchRamais]);

  useEffect(() => {
    const stored = readStoredToken();
    if (stored) setToken(stored);
  }, []);

  const validateAdmin = useCallback(async (jwt: string) => {
    setAdminBusy(true);
    setAdminError(null);
    try {
      const res = await fetch(withBasePath("/api/ramais/admin-session"), {
        headers: authHeaders(jwt),
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        user?: AdminUser;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.user) {
        setAdminUser(null);
        setAdminError(data.error || "Sessão admin inválida.");
        return false;
      }
      saveToken(jwt);
      setToken(jwt);
      setAdminUser(data.user);
      setAdminError(null);
      return true;
    } catch {
      setAdminUser(null);
      setAdminError("Falha ao validar sessão admin.");
      return false;
    } finally {
      setAdminBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!adminOpen || !token || adminUser) return;
    void validateAdmin(token);
  }, [adminOpen, token, adminUser, validateAdmin]);

  const handleLoginPassword = async () => {
    setAdminBusy(true);
    setAdminError(null);
    try {
      const res = await fetch(`${PUBLIC_API}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = (await res.json()) as {
        token?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.token) {
        setAdminError(data.error || data.message || "Login falhou.");
        return;
      }
      await validateAdmin(data.token);
    } catch {
      setAdminError("Não foi possível autenticar na API SEMIT.");
    } finally {
      setAdminBusy(false);
    }
  };

  const handlePasteToken = async () => {
    const jwt = pasteToken.trim();
    if (!jwt) {
      setAdminError("Cole um token JWT válido.");
      return;
    }
    await validateAdmin(jwt);
  };

  const handleLogout = () => {
    clearToken();
    setToken("");
    setAdminUser(null);
    setPasteToken("");
    setLoginPassword("");
  };

  const handleCreate = async () => {
    if (!token) return;
    setAdminBusy(true);
    setAdminError(null);
    try {
      const res = await fetch(withBasePath("/api/ramais"), {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ ramal: newRamal, nomeSetor: newNome }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setAdminError(data.error || "Não foi possível adicionar o ramal.");
        return;
      }
      setNewRamal("");
      setNewNome("");
      await fetchRamais();
    } catch {
      setAdminError("Falha ao adicionar ramal.");
    } finally {
      setAdminBusy(false);
    }
  };

  const startEdit = (entry: RamalEntry) => {
    if (!entry.id) return;
    setEditingId(entry.id);
    setEditRamal(entry.ramal);
    setEditNome(entry.nomeSetor);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRamal("");
    setEditNome("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!token) return;
    setAdminBusy(true);
    setAdminError(null);
    try {
      const res = await fetch(withBasePath(`/api/ramais/${id}`), {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ ramal: editRamal, nomeSetor: editNome }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setAdminError(data.error || "Não foi possível salvar a alteração.");
        return;
      }
      cancelEdit();
      await fetchRamais();
    } catch {
      setAdminError("Falha ao editar ramal.");
    } finally {
      setAdminBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !window.confirm("Excluir este ramal?")) return;
    setAdminBusy(true);
    setAdminError(null);
    try {
      const res = await fetch(withBasePath(`/api/ramais/${id}`), {
        method: "DELETE",
        headers: authHeaders(token),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setAdminError(data.error || "Não foi possível excluir o ramal.");
        return;
      }
      if (editingId === id) cancelEdit();
      await fetchRamais();
    } catch {
      setAdminError("Falha ao excluir ramal.");
    } finally {
      setAdminBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1>Ramais</h1>
        <p>Pesquise por número de ramal ou por nome/setor e compartilhe o contato no WhatsApp.</p>
      </header>

      <section className={styles.filters} aria-label="Filtros de pesquisa">
        <label className={styles.field}>
          <span>Ramal</span>
          <input
            type="search"
            inputMode="numeric"
            placeholder="Ex.: 1000"
            value={ramal}
            onChange={(e) => setRamal(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Nome / Setor</span>
          <input
            type="search"
            placeholder="Ex.: TELEFONISTA, Amanda…"
            value={nomeSetor}
            onChange={(e) => setNomeSetor(e.target.value)}
          />
        </label>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.meta}>
          {loading ? "Buscando…" : `${items.length} resultado(s)`}
        </div>
        <button
          type="button"
          className={styles.adminToggle}
          onClick={() => setAdminOpen((v) => !v)}
        >
          {adminOpen ? "Fechar área admin" : "Área admin"}
        </button>
      </div>

      {adminOpen && (
        <section className={styles.adminPanel} aria-label="Área administrativa">
          {!adminUser ? (
            <div className={styles.adminLogin}>
              <p className={styles.adminHint}>
                Entre com e-mail e senha SEMIT ou cole um JWT de administrador.
              </p>
              <div className={styles.adminFormGrid}>
                <label className={styles.field}>
                  <span>E-mail</span>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="username"
                  />
                </label>
                <label className={styles.field}>
                  <span>Senha</span>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
              </div>
              <div className={styles.adminActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={adminBusy}
                  onClick={() => void handleLoginPassword()}
                >
                  Entrar
                </button>
              </div>
              <label className={styles.field}>
                <span>Token JWT</span>
                <input
                  type="password"
                  value={pasteToken}
                  onChange={(e) => setPasteToken(e.target.value)}
                  placeholder="Cole o Bearer token…"
                />
              </label>
              <div className={styles.adminActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  disabled={adminBusy}
                  onClick={() => void handlePasteToken()}
                >
                  Usar token
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.adminLogged}>
              <div className={styles.adminUserRow}>
                <p>
                  Admin: <strong>{adminUser.name || adminUser.email || adminUser.role}</strong>
                </p>
                <button type="button" className={styles.btnGhost} onClick={handleLogout}>
                  Sair
                </button>
              </div>
              <div className={styles.adminFormGrid}>
                <label className={styles.field}>
                  <span>Novo ramal</span>
                  <input
                    value={newRamal}
                    onChange={(e) => setNewRamal(e.target.value)}
                    placeholder="Ex.: 1234"
                  />
                </label>
                <label className={styles.field}>
                  <span>Nome / Setor</span>
                  <input
                    value={newNome}
                    onChange={(e) => setNewNome(e.target.value)}
                    placeholder="Nome ou setor"
                  />
                </label>
              </div>
              <div className={styles.adminActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={adminBusy || !newRamal.trim() || !newNome.trim()}
                  onClick={() => void handleCreate()}
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}
          {adminError && <p className={styles.error}>{adminError}</p>}
        </section>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className={styles.empty}>Nenhum ramal encontrado para os filtros informados.</p>
      )}

      <ul className={styles.list}>
        {items.map((entry) => {
          const key = entry.id || `${entry.ramal}-${entry.nomeSetor}`;
          const isEditing = Boolean(adminUser && entry.id && editingId === entry.id);
          return (
            <li key={key} className={styles.card}>
              <div className={styles.cardBody}>
                {isEditing ? (
                  <div className={styles.editFields}>
                    <input
                      value={editRamal}
                      onChange={(e) => setEditRamal(e.target.value)}
                      aria-label="Editar ramal"
                    />
                    <input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      aria-label="Editar nome/setor"
                    />
                  </div>
                ) : (
                  <>
                    <p className={styles.ramal}>{entry.ramal}</p>
                    <p className={styles.nome}>{entry.nomeSetor}</p>
                  </>
                )}
              </div>
              <div className={styles.cardActions}>
                {adminUser && entry.id && (
                  isEditing ? (
                    <>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        disabled={adminBusy}
                        onClick={() => void handleSaveEdit(entry.id!)}
                      >
                        Salvar
                      </button>
                      <button type="button" className={styles.btnGhost} onClick={cancelEdit}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={() => startEdit(entry)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        disabled={adminBusy}
                        onClick={() => void handleDelete(entry.id!)}
                      >
                        Excluir
                      </button>
                    </>
                  )
                )}
                <a
                  className={styles.whatsapp}
                  href={whatsappShareUrl(entry)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Compartilhar no WhatsApp
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
