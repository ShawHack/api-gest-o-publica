"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { PLATFORM_USER_QUERY_KEY } from "@/hooks/use-platform-user";
import { api } from "@/lib/api";
import { PasswordInput } from "@/components/ui";

export default function PlatformLoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("/api/platform/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await queryClient.invalidateQueries({
        queryKey: PLATFORM_USER_QUERY_KEY,
      });
      router.replace("/platform-admin");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível entrar na plataforma.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="platform-login-page">
      <section className="platform-login-intro" aria-hidden>
        <span className="platform-login-symbol">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs/logos/logo2.png" alt="" />
        </span>
        <span className="platform-eyebrow">Control Plane</span>
        <h2>SD_Docs: operação central, visão completa.</h2>
        <p>
          Acesso exclusivo para a equipe responsável pela administração da
          plataforma.
        </p>
      </section>
      <form className="platform-login-panel" onSubmit={submit}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="platform-login-logo"
          src="/docs/logos/logomarca.png"
          alt="SD_Docs"
        />
        <span className="platform-login-lock">
          <LockKeyhole size={20} aria-hidden />
        </span>
        <span className="platform-eyebrow">Acesso restrito</span>
        <h1>Administração da Plataforma</h1>
        <p>Entre com suas credenciais de administrador.</p>
        <label>
          E-mail
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Senha
          <PasswordInput
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <div className="platform-form-error" role="alert">
          {error}
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
