"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Boxes,
  Building2,
  Globe2,
  Pencil,
  RotateCcw,
  ShieldBan,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { usePlatformUser } from "@/hooks/use-platform-user";
import { api, ApiError } from "@/lib/api";
import type {
  PlatformOrganizationDetail as OrganizationDetail,
  UpdatePlatformOrganizationAdminPayload,
  UpdatePlatformOrganizationPayload,
} from "@/lib/platform-types";
import { PlatformOrganizationStatusBadge } from "./platform-organization-status";
import {
  PlatformOrganizationTransitionDialog,
  type PlatformOrganizationTransition,
} from "./platform-organization-transition-dialog";
import { PlatformOrganizationModules } from "./platform-organization-modules";

type DetailFormValues = {
  name: string;
  displayName: string;
  slug: string;
  documentNumber: string;
  institutionalEmail: string;
  websiteUrl: string;
  phone: string;
  organizationType: string;
  documentFooterAddress: string;
  city: string;
  stateCode: string;
  countryCode: string;
  sizeCategory: string;
  printFont: string;
  trialEndsAt: string;
};

type AdminFormValues = {
  name: string;
  email: string;
  password: string;
  active: boolean;
};

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function displayDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}

function optional(value: string) {
  return value.trim() || undefined;
}

export function PlatformOrganizationDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { data: user } = usePlatformUser();
  const [editing, setEditing] = useState(false);
  const [adminEditing, setAdminEditing] = useState(false);
  const [transition, setTransition] =
    useState<PlatformOrganizationTransition | null>(null);
  const form = useForm<DetailFormValues>();
  const adminForm = useForm<AdminFormValues>();

  const query = useQuery({
    queryKey: ["platform-organization", id],
    queryFn: () => api<OrganizationDetail>(`/api/platform/organizations/${id}`),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 1,
  });

  useEffect(() => {
    if (!query.data) return;
    const organization = query.data;
    form.reset({
      name: organization.name,
      displayName: organization.displayName,
      slug: organization.slug,
      documentNumber: organization.documentNumber ?? "",
      institutionalEmail: organization.institutionalEmail ?? "",
      websiteUrl: organization.websiteUrl ?? "",
      phone: organization.phone ?? "",
      organizationType: organization.organizationType ?? "",
      documentFooterAddress: organization.documentFooterAddress ?? "",
      city: organization.city ?? "",
      stateCode: organization.stateCode ?? "",
      countryCode: organization.countryCode ?? "",
      sizeCategory: organization.sizeCategory ?? "",
      printFont: organization.printFont ?? "",
      trialEndsAt: toLocalDateTime(organization.trialEndsAt),
    });
    if (!adminEditing && organization.initialAdmin) {
      adminForm.reset({
        name: organization.initialAdmin.name,
        email: organization.initialAdmin.email,
        password: "",
        active: organization.initialAdmin.active,
      });
    }
  }, [adminEditing, adminForm, form, query.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePlatformOrganizationPayload) =>
      api<OrganizationDetail>(`/api/platform/organizations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (organization) => {
      queryClient.setQueryData(["platform-organization", id], organization);
      void queryClient.invalidateQueries({ queryKey: ["platform-organizations"] });
      setEditing(false);
    },
  });

  const transitionMutation = useMutation({
    mutationFn: ({
      action,
      reason,
    }: {
      action: PlatformOrganizationTransition;
      reason: string;
    }) =>
      api<OrganizationDetail>(`/api/platform/organizations/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: async () => {
      setTransition(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["platform-organization", id] }),
        queryClient.invalidateQueries({ queryKey: ["platform-organizations"] }),
        queryClient.invalidateQueries({ queryKey: ["platform-dashboard"] }),
      ]);
    },
  });

  const adminMutation = useMutation({
    mutationFn: (payload: UpdatePlatformOrganizationAdminPayload) =>
      api<OrganizationDetail>(`/api/platform/organizations/${id}/initial-admin`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (organization) => {
      queryClient.setQueryData(["platform-organization", id], organization);
      setAdminEditing(false);
    },
  });

  if (query.isLoading) {
    return <div className="platform-org-state">Carregando organização…</div>;
  }
  if (query.error instanceof ApiError && query.error.status === 404) {
    return (
      <div className="platform-org-not-found">
        <strong>Organização não encontrada</strong>
        <p>O registro informado não existe ou foi removido.</p>
        <Link href="/platform-admin/organizations">Voltar para organizações</Link>
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="platform-feedback" role="alert">
        {query.error instanceof ApiError
          ? query.error.message
          : "Não foi possível carregar a organização."}
      </div>
    );
  }

  const organization = query.data;
  const canUpdate = user?.permissions.includes("organization.update") ?? false;
  const canSuspend =
    organization.status === "ACTIVE" &&
    (user?.permissions.includes("organization.suspend") ?? false);
  const canReactivate =
    organization.status === "SUSPENDED" &&
    (user?.permissions.includes("organization.reactivate") ?? false);

  const submit = form.handleSubmit((values) => {
    updateMutation.mutate({
      name: values.name.trim(),
      displayName: values.displayName.trim(),
      slug: values.slug.trim(),
      documentNumber: optional(values.documentNumber),
      institutionalEmail: optional(values.institutionalEmail),
      websiteUrl: optional(values.websiteUrl),
      phone: optional(values.phone),
      organizationType: optional(values.organizationType),
      documentFooterAddress: optional(values.documentFooterAddress),
      city: optional(values.city),
      stateCode: optional(values.stateCode)?.toUpperCase(),
      countryCode: optional(values.countryCode)?.toUpperCase(),
      sizeCategory: optional(values.sizeCategory),
      printFont: optional(values.printFont),
      trialEndsAt: values.trialEndsAt
        ? new Date(values.trialEndsAt).toISOString()
        : undefined,
    });
  });

  const submitAdmin = adminForm.handleSubmit((values) => {
    adminMutation.mutate({
      name: values.name.trim(),
      email: values.email.trim(),
      active: values.active,
      ...(values.password ? { password: values.password } : {}),
    });
  });

  return (
    <section className="platform-org-page">
      <div className="platform-org-detail-heading">
        <div>
          <Link className="platform-org-back-link" href="/platform-admin/organizations">
            <ArrowLeft size={16} aria-hidden />
            Organizações
          </Link>
          <div className="platform-org-title-row">
            <h1>{organization.displayName}</h1>
            <PlatformOrganizationStatusBadge status={organization.status} />
          </div>
          <p>{organization.name}</p>
        </div>
        <div className="platform-org-heading-actions">
          {canUpdate && !editing ? (
            <button className="platform-org-secondary-button" onClick={() => setEditing(true)}>
              <Pencil size={16} aria-hidden />
              Editar dados
            </button>
          ) : null}
          {canSuspend ? (
            <button className="platform-org-danger-button" onClick={() => setTransition("suspend")}>
              <ShieldBan size={16} aria-hidden />
              Suspender
            </button>
          ) : null}
          {canReactivate ? (
            <button className="platform-org-primary-button" onClick={() => setTransition("reactivate")}>
              <RotateCcw size={16} aria-hidden />
              Reativar
            </button>
          ) : null}
        </div>
      </div>

      <div className="platform-org-counts">
        <CountCard icon={<Users aria-hidden />} label="Pessoas" value={organization.counts.users} />
        <CountCard icon={<Building2 aria-hidden />} label="Unidades" value={organization.counts.sectors} />
        <CountCard icon={<Boxes aria-hidden />} label="Módulos ativos" value={organization.counts.enabledModules} />
      </div>

      <form className="platform-org-detail-grid" onSubmit={submit}>
        <article className="platform-org-panel platform-org-metadata">
          <div className="platform-org-panel-title">
            <h2>Dados institucionais</h2>
            <span>Atualizada em {displayDate(organization.updatedAt)}</span>
          </div>
          <div className="platform-org-detail-fields">
            <DetailField label="Razão social" value={organization.name} editing={editing}>
              <input required maxLength={200} {...form.register("name")} />
            </DetailField>
            <DetailField label="Nome de exibição" value={organization.displayName} editing={editing}>
              <input required maxLength={200} {...form.register("displayName")} />
            </DetailField>
            <DetailField label="Identificador" value={organization.slug} editing={editing}>
              <input required maxLength={120} {...form.register("slug")} />
            </DetailField>
            <DetailField label="Documento" value={organization.documentNumber} editing={editing}>
              <input maxLength={50} {...form.register("documentNumber")} />
            </DetailField>
            <DetailField label="E-mail institucional" value={organization.institutionalEmail} editing={editing}>
              <input type="email" {...form.register("institutionalEmail")} />
            </DetailField>
            <DetailField label="Site" value={organization.websiteUrl} editing={editing}>
              <input type="url" {...form.register("websiteUrl")} />
            </DetailField>
            <DetailField label="Telefone" value={organization.phone} editing={editing}>
              <input maxLength={50} {...form.register("phone")} />
            </DetailField>
            <DetailField label="Tipo" value={organization.organizationType} editing={editing}>
              <input maxLength={100} {...form.register("organizationType")} />
            </DetailField>
            <DetailField label="Cidade" value={organization.city} editing={editing}>
              <input maxLength={200} {...form.register("city")} />
            </DetailField>
            <DetailField label="UF" value={organization.stateCode} editing={editing}>
              <input maxLength={2} pattern="[A-Za-z]{2}" {...form.register("stateCode")} />
            </DetailField>
            <DetailField label="País" value={organization.countryCode} editing={editing}>
              <input maxLength={2} pattern="[A-Za-z]{2}" {...form.register("countryCode")} />
            </DetailField>
            <DetailField label="Categoria de porte" value={organization.sizeCategory} editing={editing}>
              <input maxLength={100} {...form.register("sizeCategory")} />
            </DetailField>
            <DetailField label="Fonte de impressão" value={organization.printFont} editing={editing}>
              <input maxLength={100} {...form.register("printFont")} />
            </DetailField>
            <DetailField label="Fim da avaliação" value={displayDate(organization.trialEndsAt)} editing={editing}>
              <input type="datetime-local" {...form.register("trialEndsAt")} />
            </DetailField>
            <DetailField
              label="Endereço no rodapé"
              value={organization.documentFooterAddress}
              editing={editing}
              wide
            >
              <textarea rows={3} maxLength={500} {...form.register("documentFooterAddress")} />
            </DetailField>
          </div>
          {updateMutation.isError ? (
            <div className="platform-org-inline-error" role="alert">
              {updateMutation.error instanceof ApiError
                ? updateMutation.error.message
                : "Não foi possível salvar as alterações."}
            </div>
          ) : null}
          {editing ? (
            <div className="platform-org-form-actions">
              <button
                className="platform-org-cancel-button"
                type="button"
                disabled={updateMutation.isPending}
                onClick={() => {
                  form.reset();
                  updateMutation.reset();
                  setEditing(false);
                }}
              >
                Cancelar
              </button>
              <button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          ) : null}
        </article>

        <aside className="platform-org-detail-aside">
          <article className="platform-org-panel">
            <div className="platform-org-panel-title">
              <h2><Globe2 size={18} aria-hidden /> Domínios</h2>
            </div>
            {organization.domains.length ? (
              <ul className="platform-org-domain-list">
                {organization.domains.map((domain) => (
                  <li key={domain.id}>
                    <div>
                      <strong>{domain.hostname}</strong>
                      <span>
                        {domain.primary ? "Principal" : "Adicional"} ·{" "}
                        {domain.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <span>{domain.verifiedAt ? "Verificado" : "Não verificado"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="platform-org-muted">Nenhum domínio cadastrado.</p>
            )}
          </article>

          <article className="platform-org-panel">
            <div className="platform-org-panel-title">
              <h2>Administrador inicial</h2>
              {canUpdate && organization.initialAdmin && !adminEditing ? (
                <button
                  className="platform-org-secondary-button"
                  type="button"
                  onClick={() => setAdminEditing(true)}
                >
                  <Pencil size={14} aria-hidden /> Editar
                </button>
              ) : null}
            </div>
            {organization.initialAdmin ? (
              adminEditing ? (
                <div className="platform-org-admin-info">
                  <label>Nome<input required maxLength={200} {...adminForm.register("name")} /></label>
                  <label>E-mail<input required type="email" {...adminForm.register("email")} /></label>
                  <label>
                    Nova senha
                    <input
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Deixe em branco para manter"
                      {...adminForm.register("password")}
                    />
                  </label>
                  <label>
                    <input type="checkbox" {...adminForm.register("active")} /> Acesso ativo
                  </label>
                  {adminMutation.isError ? (
                    <div className="platform-org-inline-error" role="alert">
                      {adminMutation.error instanceof ApiError
                        ? adminMutation.error.message
                        : "Não foi possível atualizar o administrador."}
                    </div>
                  ) : null}
                  <div className="platform-org-form-actions">
                    <button
                      type="button"
                      className="platform-org-cancel-button"
                      disabled={adminMutation.isPending}
                      onClick={() => {
                        adminMutation.reset();
                        setAdminEditing(false);
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={adminMutation.isPending}
                      onClick={() => void submitAdmin()}
                    >
                      {adminMutation.isPending ? "Salvando…" : "Salvar administrador"}
                    </button>
                  </div>
                </div>
              ) : (
                <dl className="platform-org-admin-info">
                  <div><dt>Nome</dt><dd>{organization.initialAdmin.name}</dd></div>
                  <div><dt>E-mail</dt><dd>{organization.initialAdmin.email}</dd></div>
                  <div><dt>Acesso</dt><dd>{organization.initialAdmin.active ? "Ativo" : "Inativo"}</dd></div>
                  <div><dt>Criado em</dt><dd>{displayDate(organization.initialAdmin.createdAt)}</dd></div>
                </dl>
              )
            ) : (
              <p className="platform-org-muted">Administrador inicial não localizado.</p>
            )}
          </article>
        </aside>
      </form>

      <PlatformOrganizationModules organizationId={id} />

      <PlatformOrganizationTransitionDialog
        open={Boolean(transition)}
        transition={transition ?? "suspend"}
        organizationName={organization.displayName}
        pending={transitionMutation.isPending}
        apiError={
          transitionMutation.error instanceof ApiError
            ? transitionMutation.error.message
            : transitionMutation.isError
              ? "Não foi possível concluir a transição."
              : undefined
        }
        onCancel={() => {
          if (!transitionMutation.isPending) {
            transitionMutation.reset();
            setTransition(null);
          }
        }}
        onConfirm={(reason) => {
          if (transition) transitionMutation.mutate({ action: transition, reason });
        }}
      />
    </section>
  );
}

function CountCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article>
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </article>
  );
}

function DetailField({
  label,
  value,
  editing,
  wide,
  children,
}: {
  label: string;
  value: string | null;
  editing: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`platform-org-detail-field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {editing ? children : <strong>{value || "—"}</strong>}
    </label>
  );
}
