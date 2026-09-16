"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/lib/api";
import { useBranding } from "@/components/branding-provider";
import { PasswordInput } from "@/components/ui";
import { isDefaultBranding } from "@/lib/branding";

const schema = z.object({
  email: z
    .string()
    .min(1, "Informe um e-mail válido")
    .regex(/^[^\s@]+@[^\s@]+$/, "Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha"),
});
type LoginForm = z.infer<typeof schema>;
const PORTAL_LABEL = "Portal de Serviços";

function LoginAlert({ message }: { message?: string }) {
  if (!message) return null;
  const index = message.indexOf(PORTAL_LABEL);
  if (index === -1) return message;
  return (
    <>
      {message.slice(0, index)}
      <Link href="/portal">{PORTAL_LABEL}</Link>
      {message.slice(index + PORTAL_LABEL.length)}
    </>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const branding = useBranding();
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [mfaError, setMfaError] = useState("");
  const { register, handleSubmit, setError, formState } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });
  const submit = handleSubmit(async (values) => {
    try {
      const result = await api<{
        authenticated?: boolean;
        mfaRequired?: boolean;
        challengeToken?: string;
      }>("/api/auth/login", { method: "POST", body: JSON.stringify(values) });
      if (result.mfaRequired && result.challengeToken) {
        setChallengeToken(result.challengeToken);
        return;
      }
      // Uma consulta 401 anterior pode continuar no cache durante a navegação
      // e fazer o AppShell voltar ao login antes de buscar a nova sessão.
      queryClient.removeQueries({ queryKey: ["current-user"] });
      router.replace("/inbox");
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error ? error.message : "Credenciais inválidas",
      });
    }
  });
  const verifyMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    setMfaError("");
    try {
      await api("/api/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ challengeToken, token }),
      });
      queryClient.removeQueries({ queryKey: ["current-user"] });
      router.replace("/inbox");
    } catch (error) {
      setMfaError(error instanceof Error ? error.message : "Token inválido");
    }
  };
  if (challengeToken) {
    return (
      <main className="login-page">
        {isDefaultBranding(branding) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="login-decoration" src="/docs/logos/logo2.png" alt="" />
        )}
        <form key="mfa" className="login-panel" onSubmit={verifyMfa}>
          <div className="login-brand">
            {branding.loginLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.loginLogoUrl} alt={branding.productName} />
            ) : (
              branding.productName
            )}
          </div>
          <h1>Autenticação dupla</h1>
          <p>Informe o token de 6 dígitos do aplicativo autenticador.</p>
          <label>
            Token
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={token}
              onChange={(event) =>
                setToken(event.target.value.replace(/\D/g, ""))
              }
            />
          </label>
          <div className="form-error" role="alert">
            {mfaError}
          </div>
          <button type="submit" disabled={token.length !== 6}>
            Verificar
          </button>
        </form>
      </main>
    );
  }
  return (
    <main className="login-page">
      {isDefaultBranding(branding) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="login-decoration" src="/docs/logos/logo2.png" alt="" />
      )}
      <form key="credentials" className="login-panel" onSubmit={submit}>
        <div className="login-brand">
          {branding.loginLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.loginLogoUrl} alt={branding.productName} />
          ) : (
            branding.productName
          )}
        </div>
        <h1>{branding.loginTitle ?? "Acessar SD_Docs"}</h1>
        {branding.loginSubtitle && <p>{branding.loginSubtitle}</p>}
        <label>
          E-mail
          <input type="email" autoComplete="username" {...register("email")} />
          <small>{formState.errors.email?.message}</small>
        </label>
        <label>
          Senha
          <PasswordInput
            autoComplete="current-password"
            {...register("password")}
          />
          <small>{formState.errors.password?.message}</small>
        </label>
        <div className="form-error" role="alert">
          <LoginAlert message={formState.errors.root?.message} />
        </div>
        <button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
