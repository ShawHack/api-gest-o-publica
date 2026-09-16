"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Building2, Globe2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { usePlatformUser } from "@/hooks/use-platform-user";
import { api, ApiError } from "@/lib/api";
import { normalizeHexForPicker } from "@/lib/branding";
import { PasswordInput } from "@/components/ui";
import type {
  CreatePlatformOrganizationPayload,
  PlatformOrganizationDetail,
} from "@/lib/platform-types";

const optionalEmail = z
  .string()
  .refine(
    (value) => !value || z.email().safeParse(value).success,
    "E-mail inválido.",
  );
const optionalUrl = z
  .string()
  .refine(
    (value) => !value || z.url().safeParse(value).success,
    "Informe uma URL completa, incluindo http:// ou https://.",
  );
const optionalColor = z
  .string()
  .refine(
    (value) => !value || /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value),
    "Use uma cor hexadecimal, como #15616D.",
  );

const organizationSchema = z
  .object({
    name: z.string().trim().min(1, "Informe a razão social.").max(200),
    displayName: z
      .string()
      .trim()
      .min(1, "Informe o nome de exibição.")
      .max(200),
    slug: z
      .string()
      .trim()
      .min(1, "Informe o identificador.")
      .max(120)
      .regex(
        /^[a-zA-Z0-9À-ÿ]+(?:[-_\s][a-zA-Z0-9À-ÿ]+)*$/,
        "Use letras, números, espaços, hífens ou sublinhados.",
      ),
    documentNumber: z.string().max(50),
    institutionalEmail: optionalEmail,
    websiteUrl: optionalUrl,
    phone: z.string().max(50),
    organizationType: z.string().max(100),
    documentFooterAddress: z.string().max(500),
    city: z.string().max(200),
    stateCode: z
      .string()
      .refine(
        (value) => !value || /^[a-zA-Z]{2}$/.test(value),
        "Use 2 letras.",
      ),
    countryCode: z
      .string()
      .refine((value) => /^[a-zA-Z]{2}$/.test(value), "Use 2 letras."),
    sizeCategory: z.string().max(100),
    printFont: z.string().max(100),
    trialEndsAt: z.string(),
    hostname: z
      .string()
      .trim()
      .min(1, "Informe o domínio principal.")
      .regex(
        /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/,
        "Informe um domínio válido.",
      ),
    shortName: z.string().trim().min(1, "Informe o nome curto.").max(80),
    productName: z.string().max(200),
    primaryColor: optionalColor,
    primaryHoverColor: optionalColor,
    linkColor: optionalColor,
    accentColor: optionalColor,
    adminName: z
      .string()
      .trim()
      .min(1, "Informe o nome do administrador.")
      .max(200),
    adminEmail: z.email("E-mail inválido."),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

type OrganizationFormValues = z.infer<typeof organizationSchema>;

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function PlatformOrganizationForm() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = usePlatformUser();
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      displayName: "",
      slug: "",
      documentNumber: "",
      institutionalEmail: "",
      websiteUrl: "",
      phone: "",
      organizationType: "Outro",
      documentFooterAddress: "",
      city: "",
      stateCode: "",
      countryCode: "BR",
      sizeCategory: "",
      printFont: "",
      trialEndsAt: "",
      hostname: "",
      shortName: "",
      productName: "",
      primaryColor: "#15616D",
      primaryHoverColor: "#0F4C56",
      linkColor: "#15616D",
      accentColor: "#2BBBAD",
      adminName: "",
      adminEmail: "",
      password: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: CreatePlatformOrganizationPayload) =>
      api<PlatformOrganizationDetail>("/api/platform/organizations", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (organization) => {
      router.replace(`/platform-admin/organizations/${organization.id}`);
    },
  });

  if (userLoading) {
    return <div className="platform-org-state">Carregando permissões…</div>;
  }
  if (!user?.permissions.includes("organization.create")) {
    return (
      <div className="platform-feedback" role="alert">
        Você não tem permissão para criar organizações.
      </div>
    );
  }

  const submit = form.handleSubmit((values) => {
    const payload: CreatePlatformOrganizationPayload = {
      organization: {
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
        countryCode: values.countryCode.toUpperCase(),
        sizeCategory: optional(values.sizeCategory),
        printFont: optional(values.printFont),
        trialEndsAt: values.trialEndsAt
          ? new Date(values.trialEndsAt).toISOString()
          : undefined,
      },
      domain: { hostname: values.hostname.trim().toLowerCase() },
      branding: {
        shortName: values.shortName.trim(),
        productName: optional(values.productName),
        primaryColor: optional(values.primaryColor),
        primaryHoverColor: optional(values.primaryHoverColor),
        linkColor: optional(values.linkColor),
        accentColor: optional(values.accentColor),
      },
      initialAdmin: {
        name: values.adminName.trim(),
        email: values.adminEmail.trim(),
        password: values.password,
      },
    };
    mutation.mutate(payload);
  });

  const errorFor = (name: keyof OrganizationFormValues) =>
    form.formState.errors[name]?.message;

  return (
    <section className="platform-org-page">
      <div className="platform-page-heading">
        <div>
          <Link
            className="platform-org-back-link"
            href="/platform-admin/organizations"
          >
            <ArrowLeft size={16} aria-hidden />
            Organizações
          </Link>
          <h1>Nova organização</h1>
          <p>Configure os dados e o primeiro acesso administrativo.</p>
        </div>
      </div>

      <form className="platform-org-form" onSubmit={submit} noValidate>
        <FormSection
          icon={<Building2 aria-hidden />}
          title="Dados institucionais"
        >
          <FormField label="Razão social" required error={errorFor("name")}>
            <input {...form.register("name")} />
          </FormField>
          <FormField
            label="Nome de exibição"
            required
            error={errorFor("displayName")}
          >
            <input {...form.register("displayName")} />
          </FormField>
          <FormField label="Identificador" required error={errorFor("slug")}>
            <input
              {...form.register("slug")}
              placeholder="prefeitura-exemplo"
            />
          </FormField>
          <FormField label="Documento" error={errorFor("documentNumber")}>
            <input {...form.register("documentNumber")} />
          </FormField>
          <FormField
            label="E-mail institucional"
            error={errorFor("institutionalEmail")}
          >
            <input type="email" {...form.register("institutionalEmail")} />
          </FormField>
          <FormField label="Site" error={errorFor("websiteUrl")}>
            <input
              type="url"
              placeholder="https://"
              {...form.register("websiteUrl")}
            />
          </FormField>
          <FormField label="Telefone" error={errorFor("phone")}>
            <input {...form.register("phone")} />
          </FormField>
          <FormField
            label="Tipo de organização"
            error={errorFor("organizationType")}
          >
            <input {...form.register("organizationType")} />
          </FormField>
          <FormField label="Cidade" error={errorFor("city")}>
            <input {...form.register("city")} />
          </FormField>
          <FormField label="UF" error={errorFor("stateCode")}>
            <input maxLength={2} {...form.register("stateCode")} />
          </FormField>
          <FormField label="País" required error={errorFor("countryCode")}>
            <input maxLength={2} {...form.register("countryCode")} />
          </FormField>
          <FormField
            label="Categoria de porte"
            error={errorFor("sizeCategory")}
          >
            <input {...form.register("sizeCategory")} />
          </FormField>
          <FormField label="Fonte de impressão" error={errorFor("printFont")}>
            <input {...form.register("printFont")} />
          </FormField>
          <FormField
            label="Fim do período de avaliação"
            error={errorFor("trialEndsAt")}
          >
            <input type="datetime-local" {...form.register("trialEndsAt")} />
          </FormField>
          <FormField
            label="Endereço no rodapé dos documentos"
            error={errorFor("documentFooterAddress")}
            wide
          >
            <textarea rows={3} {...form.register("documentFooterAddress")} />
          </FormField>
        </FormSection>

        <FormSection icon={<Globe2 aria-hidden />} title="Acesso principal">
          <FormField
            label="Domínio principal"
            required
            error={errorFor("hostname")}
          >
            <input
              {...form.register("hostname")}
              placeholder="docs.exemplo.gov.br"
            />
          </FormField>
          <FormField label="Nome curto" required error={errorFor("shortName")}>
            <input {...form.register("shortName")} />
          </FormField>
          <FormField label="Nome do produto" error={errorFor("productName")}>
            <input {...form.register("productName")} />
          </FormField>
          <FormField label="Cor principal" error={errorFor("primaryColor")}>
            <div className="sd-color-field">
              <input
                type="color"
                className="sd-color-swatch"
                value={normalizeHexForPicker(
                  form.watch("primaryColor"),
                  "#15616d",
                )}
                onChange={(event) =>
                  form.setValue("primaryColor", event.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                aria-label="Cor principal — seletor visual"
                title="Abrir seletor de cores"
              />
              <input
                {...form.register("primaryColor")}
                placeholder="#15616D"
                spellCheck={false}
              />
            </div>
          </FormField>
          <FormField
            label="Cor de interação"
            error={errorFor("primaryHoverColor")}
          >
            <div className="sd-color-field">
              <input
                type="color"
                className="sd-color-swatch"
                value={normalizeHexForPicker(
                  form.watch("primaryHoverColor"),
                  "#0f4c56",
                )}
                onChange={(event) =>
                  form.setValue("primaryHoverColor", event.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                aria-label="Cor de interação — seletor visual"
                title="Abrir seletor de cores"
              />
              <input
                {...form.register("primaryHoverColor")}
                placeholder="#0F4C56"
                spellCheck={false}
              />
            </div>
          </FormField>
          <FormField label="Cor de links" error={errorFor("linkColor")}>
            <div className="sd-color-field">
              <input
                type="color"
                className="sd-color-swatch"
                value={normalizeHexForPicker(form.watch("linkColor"), "#15616d")}
                onChange={(event) =>
                  form.setValue("linkColor", event.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                aria-label="Cor de links — seletor visual"
                title="Abrir seletor de cores"
              />
              <input
                {...form.register("linkColor")}
                placeholder="#15616D"
                spellCheck={false}
              />
            </div>
          </FormField>
          <FormField label="Cor de destaque" error={errorFor("accentColor")}>
            <div className="sd-color-field">
              <input
                type="color"
                className="sd-color-swatch"
                value={normalizeHexForPicker(
                  form.watch("accentColor"),
                  "#2bbbad",
                )}
                onChange={(event) =>
                  form.setValue("accentColor", event.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                aria-label="Cor de destaque — seletor visual"
                title="Abrir seletor de cores"
              />
              <input
                {...form.register("accentColor")}
                placeholder="#2BBBAD"
                spellCheck={false}
              />
            </div>
          </FormField>
        </FormSection>

        <FormSection
          icon={<UserRound aria-hidden />}
          title="Administrador inicial"
        >
          <FormField
            label="Nome completo"
            required
            error={errorFor("adminName")}
          >
            <input {...form.register("adminName")} />
          </FormField>
          <FormField label="E-mail" required error={errorFor("adminEmail")}>
            <input type="email" {...form.register("adminEmail")} />
          </FormField>
          <FormField label="Senha" required error={errorFor("password")}>
            <PasswordInput
              autoComplete="new-password"
              {...form.register("password")}
            />
          </FormField>
          <FormField
            label="Confirmar senha"
            required
            error={errorFor("confirmPassword")}
          >
            <PasswordInput
              autoComplete="new-password"
              {...form.register("confirmPassword")}
            />
          </FormField>
        </FormSection>

        {mutation.isError ? (
          <div className="platform-org-inline-error" role="alert">
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : "Não foi possível criar a organização."}
          </div>
        ) : null}

        <div className="platform-org-form-actions">
          <Link href="/platform-admin/organizations">Cancelar</Link>
          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Criando…" : "Criar organização"}
          </button>
        </div>
      </form>
    </section>
  );
}

function FormSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="platform-org-form-section">
      <legend>
        <span>{icon}</span>
        {title}
      </legend>
      <div className="platform-org-form-grid">{children}</div>
    </fieldset>
  );
}

function FormField({
  label,
  required,
  error,
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`platform-org-field ${wide ? "wide" : ""}`}>
      <span>
        {label}
        {required ? <em aria-hidden>*</em> : null}
      </span>
      {children}
      {error ? (
        <small role="alert" className="platform-org-field-error">
          {error}
        </small>
      ) : null}
    </label>
  );
}
