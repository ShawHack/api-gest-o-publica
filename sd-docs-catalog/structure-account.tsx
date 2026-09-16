"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  Copy,
  Edit3,
  FileText,
  GripVertical,
  ImagePlus,
  KeyRound,
  Mail,
  PenLine,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api, ApiError } from "@/lib/api";
import { createClientId } from "@/lib/client-id";
import type {
  AttachmentFileName,
  ServiceFormField,
  ServiceFormFieldType,
} from "@/lib/types";
import { HierarchyConnector, HierarchyTable, PaginationCompact } from "./admin";
import { useDialog } from "@/components/ui/dialog-provider";
import { AdminBackButton } from "./admin-back-button";
import { AdminListToolbar } from "./admin-list-toolbar";
import { RichTextEditor } from "./documents";
import { toggleCollapsedId, TreeToggle } from "./tree-toggle";
import { FilterPillSelect } from "@/components/ui/filter-pill-select";

type Template = {
  id: string;
  name: string;
  scope: "USER" | "SECTOR" | "ORGANIZATION";
  sectorId: string | null;
};
type SignerList = { id: string; name: string; items: unknown[] };
type SendList = { id: string; name: string; status: string };
type Charter = {
  id: string;
  sectorId: string | null;
  taxonomyContextId: string | null;
  parentId: string | null;
  name: string;
  icon?: string;
  description: string;
  online: boolean;
  featuredTerm?: string;
  status?: string;
  sector?: { id: string; code: string; name: string } | null;
  taxonomyContext?: OfficialCategory | null;
  fileNames?: Array<{ fileName: AttachmentFileName; required: boolean }>;
  subjects?: Array<{ subject: { id: string } }>;
  form?: { fieldsJson: ServiceFormField[] } | null;
  officialContent?: Record<string, string> | null;
  children: Charter[];
};
type Role = { id: string; name: string };
type OfficialCategory = {
  id: string;
  key: string;
  name: string;
};
const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  protocols: "Protocolos",
  ombudsman: "Ouvidoria",
  administrative_processes: "Processo interno",
  inspections: "Fiscalizações",
  project_analyses: "Projeto",
  lai: "Publicações Oficiais",
};
type SectorOption = {
  id: string;
  code: string;
  name: string;
  children: SectorOption[];
};
type PersonList = { id: string; name: string };
type Person = {
  id: string;
  type: "PERSON" | "COMPANY";
  name: string;
  email?: string;
  phone?: string;
  interactionsCount?: number;
  loginCount?: number;
  memberships: Array<{ personList: PersonList }>;
};
type Signature = {
  id: string;
  status: "PENDING" | "SIGNED" | "REJECTED";
  requestedAt: string;
  signedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  signatureLevel?: "SIMPLE" | "ADVANCED" | "QUALIFIED";
  signatureProvider?: "SDDOCS" | "GOVBR" | "ICP_BRASIL";
  verificationCode?: string | null;
  evidenceHash?: string | null;
  message?: string;
  document: {
    id: string;
    number: number | null;
    year: number;
    subject: string;
    body: string;
  };
  requestedBy: { name: string };
  attachment?: { id: string; originalName: string; mimeType: string } | null;
};
type Account = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  cpf?: string | null;
  registration?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  jobTitle?: string | null;
  phoneAreaCode?: string | null;
  landline?: string | null;
  mobile?: string | null;
  mfa: {
    enabled: boolean;
    enabledAt: string | null;
  };
  preferences?: {
    timezone?: string;
    documentsPerPage?: number;
    editorMode?: string;
    attachmentViewMode?: string;
    emailNotificationMode?: string;
    mentionNotification?: boolean;
    textualSignature?: string;
    secondaryEmail?: string | null;
    showMobileInPhones?: boolean;
  };
  userSectors: Array<{
    isPrimary: boolean;
    sector: { code: string; name: string };
  }>;
};
type Career = {
  id: string;
  isCurrent: boolean;
  isPrimary: boolean;
  startedAt: string;
  sector: { code: string; name: string };
  changedBy?: { name: string };
};
type CharterFormState = {
  name: string;
  sectorId: string;
  taxonomyContextId: string;
  parentId: string;
  icon: string;
  subjectIds: string[];
  attachmentFileNameIds: string[];
  requiredAttachmentFileNameIds: string[];
  customFormEnabled: boolean;
  formFields: ServiceFormField[];
  online: boolean;
  featuredTerm: string;
  description: string;
  officialContent: Record<string, string>;
  officialIconFile: File | null;
};

const OFFICIAL_CONTENT_FIELDS = [
  ["whatIs", "O que é o serviço"],
  ["purpose", "Para que ele serve"],
  ["expectedResult", "Resultado que o cidadão pode obter"],
  ["targetAudience", "Quem pode solicitar / público-alvo"],
  ["accessRequirements", "Requisitos e condições de acesso"],
  ["requiredDocuments", "Documentos exigidos"],
  ["requiredForms", "Formulários necessários"],
  ["requiredInformation", "Informações que o cidadão deve fornecer"],
  ["specialConditions", "Condições específicas"],
  ["serviceSteps", "Etapas para obtenção do serviço"],
  ["completionDeadline", "Prazo máximo ou previsão de conclusão"],
  ["deliveryChannels", "Forma de prestação"],
  ["serviceLocation", "Local e endereço de atendimento"],
  ["responsibleSector", "Setor responsável"],
  ["openingHours", "Horário de funcionamento"],
  ["accessInstructions", "Forma de acesso ao serviço"],
  ["schedulingInstructions", "Agendamento"],
  ["contactChannels", "Canais de comunicação"],
  ["ombudsmanChannels", "Reclamação, sugestão, denúncia ou elogio"],
  ["priorityRules", "Prioridades de atendimento"],
  ["estimatedWaitTime", "Tempo estimado de espera"],
  ["serviceStandards", "Compromissos e padrões de qualidade"],
  ["userCommunication", "Forma de comunicação com o usuário"],
  ["trackingInstructions", "Como acompanhar o andamento"],
] as const;

function emptyOfficialContent(): Record<string, string> {
  return Object.fromEntries(OFFICIAL_CONTENT_FIELDS.map(([key]) => [key, ""]));
}

const contexts = [
  ["general", "Institucional"],
  ["memorandum", "Memorandos"],
  ["circular", "Comunicados"],
  ["office", "Ofícios"],
  ["ombudsman", "Ouvidoria"],
  ["protocol", "Protocolos"],
  ["project_analysis", "Projetos"],
  ["inspection", "Fiscalizações"],
  ["document", "Documentos"],
  ["notification", "Notificações"],
  ["administrative_process", "Processos internos"],
  ["official_act", "Atos oficiais"],
] as const;

function LoadingError({
  loading,
  error,
}: {
  loading: boolean;
  error: boolean;
}) {
  if (loading) return <p>Carregando...</p>;
  if (error)
    return <p className="inline-error">Não foi possível carregar os dados.</p>;
  return null;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="reference-empty">{children}</div>;
}

function templateVisibilityLabel(scope: Template["scope"]) {
  if (scope === "USER") return "Somente eu";
  if (scope === "ORGANIZATION") return "Toda a instituição";
  return "Unidade";
}

function TemplateCreateForm({
  canPublishOrganization,
  onCancel,
}: {
  canPublishOrganization: boolean;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"USER" | "ORGANIZATION">("USER");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () =>
      api("/api/backend/structure/response-templates", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          content,
          scope,
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      await queryClient.invalidateQueries({
        queryKey: ["document-text-templates"],
      });
      onCancel();
    },
    onError: (caught: unknown) => {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível concluir a operação.",
      );
    },
  });
  return (
    <section className="sd-create-page" aria-label="Novo texto padrão">
      <AdminBackButton onClick={onCancel}>
        Voltar aos textos padrão
      </AdminBackButton>
      <header className="sd-create-header">
        <span>Gestão</span>
        <h1>Novo texto padrão</h1>
        <p>Crie textos padrão e insira-os facilmente nos documentos.</p>
      </header>
      <form
        className="sd-form"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          save.mutate();
        }}
      >
        <fieldset className="sd-form-section">
          <legend>
            <span>01</span> Identificação
          </legend>
          <p>Defina o título e quem poderá usar este texto.</p>
          <div className="sd-form-grid">
            <label className="sd-field">
              Título *
              <input
                required
                maxLength={200}
                value={name}
                placeholder="Título do texto"
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="sd-field">
              Visibilidade *
              <FilterPillSelect
                label="Visibilidade"
                hideLabel
                required
                value={scope}
                className="sd-pill-select"
                onChange={(next) =>
                  setScope(next as "USER" | "ORGANIZATION")
                }
                options={[
                  { value: "USER", label: "Somente eu" },
                  ...(canPublishOrganization
                    ? [
                        {
                          value: "ORGANIZATION",
                          label: "Toda a instituição",
                        },
                      ]
                    : []),
                ]}
              />
            </label>
          </div>
        </fieldset>
        <fieldset className="sd-form-section">
          <legend>
            <span>02</span> Conteúdo
          </legend>
          <p>Redija o texto que será inserido no documento.</p>
          <div className="template-form-editor">
            <RichTextEditor
              value={content}
              onChange={setContent}
              ariaLabel="Conteúdo do texto padrão"
              showLibrary={false}
            />
          </div>
        </fieldset>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-form-actions">
          <button
            className="admin-button secondary"
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className="admin-button"
            type="submit"
            disabled={save.isPending || !name.trim() || !content.trim()}
          >
            Salvar
          </button>
        </div>
      </form>
    </section>
  );
}

export function TemplatesPage() {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { data: user } = useCurrentUser();
  const sectorId = user?.userSectors.find((item) => item.isPrimary)?.sector.id;
  const personal = useQuery({
    queryKey: ["templates", "user"],
    queryFn: () =>
      api<Template[]>("/api/backend/structure/response-templates?scope=USER"),
  });
  const sector = useQuery({
    queryKey: ["templates", "sector", sectorId],
    queryFn: () =>
      api<Template[]>(
        `/api/backend/structure/response-templates?scope=SECTOR&sectorId=${sectorId}`,
      ),
    enabled: Boolean(sectorId),
  });
  const canOrganization =
    user?.permissions.includes("templates.manage") ?? false;
  const organization = useQuery({
    queryKey: ["templates", "organization"],
    queryFn: () =>
      api<Template[]>(
        "/api/backend/structure/response-templates?scope=ORGANIZATION",
      ),
    enabled: canOrganization,
  });
  if (creating) {
    return (
      <TemplateCreateForm
        canPublishOrganization={canOrganization}
        onCancel={() => setCreating(false)}
      />
    );
  }
  const table = (title: string, rows: Template[]) => (
    <section className="admin-subsection">
      <h2>{title}</h2>
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Visibilidade</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((row) =>
              row.name
                .toLocaleLowerCase("pt-BR")
                .includes(search.trim().toLocaleLowerCase("pt-BR")),
            )
            .map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{templateVisibilityLabel(row.scope)}</td>
                <td>
                  <button
                    disabled
                    title="Formulário de edição em breve nesta versão"
                  >
                    Editar
                  </button>{" "}
                  <button
                    disabled
                    title="Fluxo de desativação em breve nesta versão"
                  >
                    Desativar
                  </button>
                </td>
              </tr>
            ))}
          {!rows.length && (
            <tr>
              <td colSpan={3} className="empty-row">
                Nenhum texto padrão habilitado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
  return (
    <>
      <h1 className="admin-title dense-title">
        <FileText size={18} /> Textos padrão <span>· ativos</span>
      </h1>
      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchLabel="Buscar textos padrão"
        actions={
          <button
            type="button"
            className="admin-button"
            onClick={() => setCreating(true)}
          >
            Adicionar texto padrão
          </button>
        }
      />
      <LoadingError
        loading={
          personal.isLoading || sector.isLoading || organization.isLoading
        }
        error={personal.isError || sector.isError || organization.isError}
      />
      {table("Meus textos", personal.data ?? [])}
      {table(
        `Textos da unidade: ${user?.userSectors.find((item) => item.isPrimary)?.sector.code ?? ""}`,
        sector.data ?? [],
      )}
      {canOrganization &&
        table("Textos institucionais", organization.data ?? [])}
    </>
  );
}

export function SignerListsPage() {
  const client = useQueryClient();
  const [context, setContext] = useState("general");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const query = useQuery({
    queryKey: ["signer-lists", context],
    queryFn: () =>
      api<SignerList[]>(
        `/api/backend/structure/signer-lists?context=${context}`,
      ),
  });
  const destinations = useQuery({
    queryKey: ["signer-list-candidates"],
    queryFn: () =>
      api<
        Array<{
          id: string;
          people?: Array<{ id: string; name: string }>;
        }>
      >("/api/backend/documents/destinations"),
    enabled: creating,
  });
  const candidates = useMemo(() => {
    const rows = Array.isArray(destinations.data) ? destinations.data : [];
    return Array.from(
      new Map(
        rows
          .flatMap((sector) => sector.people ?? [])
          .map((person) => [person.id, person] as const),
      ).values(),
    ).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [destinations.data]);
  const create = useMutation({
    mutationFn: () =>
      api("/api/backend/structure/signer-lists", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          context,
          scope: "ORGANIZATION",
          userIds: selectedUserIds,
        }),
      }),
    onSuccess: async () => {
      setCreating(false);
      setName("");
      setSelectedUserIds([]);
      setFormError("");
      await client.invalidateQueries({ queryKey: ["signer-lists", context] });
    },
    onError: (caught: unknown) => {
      setFormError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível criar o grupo.",
      );
    },
  });
  const label =
    contexts.find(([key]) => key === context)?.[1] ?? "Institucional";
  if (creating) {
    return (
      <section className="sd-create-page" aria-label="Novo grupo de assinatura">
        <AdminBackButton
          onClick={() => {
            setCreating(false);
            setFormError("");
          }}
        >
          Voltar aos grupos de assinatura
        </AdminBackButton>
        <header className="sd-create-header">
          <span>Gestão</span>
          <h1>Novo grupo de assinatura</h1>
          <p>
            Cadastre um grupo em {label} para reutilizar assinantes nos
            documentos.
          </p>
        </header>
        <form
          className="sd-form"
          onSubmit={(event) => {
            event.preventDefault();
            setFormError("");
            if (!name.trim()) {
              setFormError("Informe o nome do grupo.");
              return;
            }
            create.mutate();
          }}
        >
          <fieldset className="sd-form-section">
            <legend>
              <span>01</span> Identificação
            </legend>
            <div className="sd-form-grid">
              <label className="sd-field">
                Nome do grupo *
                <input
                  required
                  maxLength={200}
                  value={name}
                  placeholder="Ex.: Assinantes da direção"
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="sd-field">
                Contexto
                <input value={label} readOnly aria-label="Contexto do grupo" />
              </label>
            </div>
          </fieldset>
          <fieldset className="sd-form-section">
            <legend>
              <span>02</span> Assinantes
            </legend>
            <p>Opcional. Selecione as pessoas que farão parte deste grupo.</p>
            {destinations.isLoading ? (
              <p>Carregando pessoas...</p>
            ) : destinations.isError ? (
              <p className="inline-error">
                Não foi possível carregar a lista de pessoas.
              </p>
            ) : (
              <div className="signer-list-picker">
                {candidates.map((person) => {
                  const checked = selectedUserIds.includes(person.id);
                  return (
                    <label className="check" key={person.id}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setSelectedUserIds((current) =>
                            event.target.checked
                              ? [...current, person.id]
                              : current.filter((id) => id !== person.id),
                          )
                        }
                      />{" "}
                      {person.name}
                    </label>
                  );
                })}
                {!candidates.length && (
                  <p className="charter-category-hint">
                    Nenhuma pessoa disponível para adicionar agora.
                  </p>
                )}
              </div>
            )}
          </fieldset>
          {formError && (
            <p className="inline-error" role="alert">
              {formError}
            </p>
          )}
          <div className="admin-form-actions">
            <button
              className="admin-button secondary"
              type="button"
              onClick={() => {
                setCreating(false);
                setFormError("");
              }}
            >
              Cancelar
            </button>
            <button
              className="admin-button"
              type="submit"
              disabled={create.isPending || !name.trim()}
            >
              {create.isPending ? "Criando…" : "Criar grupo"}
            </button>
          </div>
        </form>
      </section>
    );
  }
  return (
    <>
      <h1 className="admin-title dense-title">
        <UsersRound size={18} /> Grupos de assinatura <span>· ativos</span>
      </h1>
      <p>{query.data?.length ?? 0} grupo(s) de assinatura</p>
      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchLabel="Buscar grupos de assinatura"
        actions={
          <>
            <FilterPillSelect
              label="Contexto do grupo"
              hideLabel
              value={context}
              className="sd-pill-select admin-toolbar-pill"
              onChange={setContext}
              options={contexts.map(([key, name]) => ({
                value: key,
                label: name,
              }))}
            />
            <button
              type="button"
              className="admin-action-add"
              onClick={() => {
                setCreating(true);
                setName("");
                setSelectedUserIds([]);
                setFormError("");
              }}
            >
              Adicionar grupo
            </button>
          </>
        }
      />
      <LoadingError loading={query.isLoading} error={query.isError} />
      {!query.data?.length ? (
        <Empty>
          Nenhum grupo em {label}. Cadastre um grupo de assinatura para otimizar
          seu trabalho.{" "}
          <Link href="/ajuda">Saiba mais &gt;&gt; Ajuda e documentação</Link>
        </Empty>
      ) : (
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Assinantes</th>
            </tr>
          </thead>
          <tbody>
            {query.data
              .filter((row) =>
                row.name
                  .toLocaleLowerCase("pt-BR")
                  .includes(search.trim().toLocaleLowerCase("pt-BR")),
              )
              .map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.items.length}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function SendListsPage() {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const query = useQuery({
    queryKey: ["send-lists"],
    queryFn: () =>
      api<SendList[]>("/api/backend/structure/send-lists?status=ACTIVE"),
  });
  return (
    <>
      <h1 className="admin-title dense-title">
        <FileText size={18} /> Grupos de destinatários
      </h1>
      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchLabel="Buscar grupos de destinatários"
        actions={
          <>
            <button type="button">Ativos</button>
            <button
              type="button"
              disabled
              title="Composição indisponível nesta versão"
            >
              Adicionar grupo
            </button>
          </>
        }
      />
      <LoadingError loading={query.isLoading} error={query.isError} />
      {!query.data?.length ? (
        <Empty>Nenhum grupo de destinatários encontrado.</Empty>
      ) : (
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {query.data
              .filter((row) =>
                row.name
                  .toLocaleLowerCase("pt-BR")
                  .includes(search.trim().toLocaleLowerCase("pt-BR")),
              )
              .map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.status === "ACTIVE" ? "Ativa" : "Inativa"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function flattenCharters(
  nodes: Charter[],
  depth = 0,
  collapsedIds: Set<string> = new Set(),
): Array<{ node: Charter; depth: number }> {
  return nodes.flatMap((node) => [
    { node, depth },
    ...(collapsedIds.has(node.id)
      ? []
      : flattenCharters(node.children ?? [], depth + 1, collapsedIds)),
  ]);
}

function filterCharterTree(nodes: Charter[], search: string): Charter[] {
  const term = search.trim().toLocaleLowerCase("pt-BR");
  if (!term) return nodes;

  return nodes.flatMap((node) => {
    const matches = node.name.toLocaleLowerCase("pt-BR").includes(term);
    if (matches) {
      return [node];
    }
    const children = filterCharterTree(node.children ?? [], term);
    return children.length ? [{ ...node, children }] : [];
  });
}

function chartersForCategory(nodes: Charter[], categoryId: string): Charter[] {
  const matching = flattenCharters(nodes)
    .map(({ node }) => node)
    .filter((node) => node.taxonomyContextId === categoryId);
  const byId = new Map(
    matching.map((node) => [node.id, { ...node, children: [] as Charter[] }]),
  );
  const roots: Charter[] = [];

  for (const node of matching) {
    const current = byId.get(node.id)!;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(current);
    else roots.push(current);
  }

  return roots;
}

function flattenSectors(nodes: SectorOption[]): SectorOption[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenSectors(node.children ?? []),
  ]);
}

function emptyCharterForm(categoryId: string): CharterFormState {
  return {
    name: "",
    sectorId: "",
    taxonomyContextId: categoryId,
    parentId: "",
    icon: "",
    subjectIds: [],
    attachmentFileNameIds: [],
    requiredAttachmentFileNameIds: [],
    customFormEnabled: false,
    formFields: [],
    online: false,
    featuredTerm: "",
    description: "",
    officialContent: emptyOfficialContent(),
    officialIconFile: null,
  };
}

function charterToFormState(
  charter: Charter,
  categoryId: string,
  name = charter.name,
): CharterFormState {
  const attachmentFileNameIds =
    charter.fileNames?.map((item) => item.fileName.id) ?? [];
  return {
    name,
    sectorId: charter.sectorId ?? "",
    taxonomyContextId: charter.taxonomyContextId ?? categoryId,
    parentId: charter.parentId ?? "",
    icon: charter.icon ?? "",
    subjectIds: charter.subjects?.map((item) => item.subject.id) ?? [],
    attachmentFileNameIds,
    requiredAttachmentFileNameIds:
      charter.fileNames
        ?.filter((item) => item.required)
        .map((item) => item.fileName.id) ?? [],
    customFormEnabled: Boolean(charter.form?.fieldsJson.length),
    formFields: charter.form?.fieldsJson ?? [],
    online: charter.online,
    featuredTerm: charter.featuredTerm ?? "",
    description: charter.description,
    officialContent: {
      ...emptyOfficialContent(),
      ...(charter.officialContent ?? {}),
    },
    officialIconFile: null,
  };
}

function charterSubtreeIds(root: Charter): Set<string> {
  return new Set(flattenCharters([root]).map(({ node }) => node.id));
}

const normalizeCharterName = (name: string) =>
  name
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");

export function ServiceChartersPage() {
  const { data: user } = useCurrentUser();
  const { confirm } = useDialog();
  const canManage =
    user?.permissions.includes("service_charters.manage") ?? false;
  const [formOpen, setFormOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [listStatus, setListStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [form, setForm] = useState<CharterFormState>(() =>
    emptyCharterForm(""),
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [draggedCharter, setDraggedCharter] = useState<Charter | null>(null);
  const [charterDropTargetId, setCharterDropTargetId] = useState<string | null>(
    null,
  );
  const charterPointerMovedRef = useRef(false);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["service-charters", listStatus],
    queryFn: () =>
      api<Charter[]>(
        `/api/backend/structure/service-charters/tree?status=${listStatus}`,
      ),
  });
  const categories = useQuery({
    queryKey: ["taxonomy-contexts"],
    queryFn: () =>
      api<OfficialCategory[]>("/api/backend/admin/taxonomy-contexts"),
  });
  const sectors = useQuery({
    queryKey: ["admin-sectors-tree"],
    queryFn: () => api<SectorOption[]>("/api/backend/admin/sectors/tree"),
  });
  const fileNames = useQuery({
    queryKey: ["structure-attachment-file-names"],
    queryFn: () =>
      api<AttachmentFileName[]>("/api/backend/structure/attachment-file-names"),
  });
  const categoryRows = (categories.data ?? [])
    .filter((category) => category.key in SERVICE_CATEGORY_LABELS)
    .map((category) => ({
      ...category,
      name: SERVICE_CATEGORY_LABELS[category.key],
    }));
  const sectorRows = useMemo(
    () => flattenSectors(sectors.data ?? []),
    [sectors.data],
  );
  const activeCategoryId = selectedCategoryId || categoryRows[0]?.id || "";
  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedName = form.name.trim();
      if (!trimmedName) {
        throw new ApiError("Informe o nome do serviço.", 400);
      }
      const currentContextId = form.taxonomyContextId || activeCategoryId;
      const allLoadedRows = flattenCharters(query.data ?? []);
      const duplicateCharter = allLoadedRows.find(
        ({ node }) =>
          node.id !== editingId &&
          node.taxonomyContextId === currentContextId &&
          normalizeCharterName(node.name) === normalizeCharterName(trimmedName),
      );
      if (duplicateCharter) {
        const catName = categoryRows.find(
          (c) => c.id === duplicateCharter.node.taxonomyContextId,
        )?.name;
        const details: string[] = [];
        if (catName) details.push(`Categoria: "${catName}"`);
        if (duplicateCharter.node.sector?.name)
          details.push(`Setor: "${duplicateCharter.node.sector.name}"`);
        const statusLabel =
          duplicateCharter.node.status === "ACTIVE"
            ? "Ativo"
            : duplicateCharter.node.status === "INACTIVE"
              ? "Inativo"
              : duplicateCharter.node.status;
        if (statusLabel) details.push(`Status: ${statusLabel}`);

        const detailStr = details.length ? ` (${details.join(" | ")})` : "";
        throw new ApiError(
          `Já existe um serviço cadastrado com este nome${detailStr}.`,
          409,
        );
      }
      const payload = {
        name: trimmedName,
        sectorId: form.sectorId,
        taxonomyContextId: form.taxonomyContextId,
        parentId: form.parentId || null,
        icon: form.icon || undefined,
        subjectIds: form.subjectIds,
        attachmentFileNameIds: form.attachmentFileNameIds,
        requiredAttachmentFileNameIds: form.requiredAttachmentFileNameIds,
        formFields: form.customFormEnabled ? form.formFields : [],
        online: form.online,
        featuredTerm: form.online ? form.featuredTerm || undefined : undefined,
        description: form.description,
        officialContent: form.online ? form.officialContent : undefined,
        status: "ACTIVE" as const,
      };
      const entity = editingId
        ? await api<{ id: string }>(
            `/api/backend/structure/service-charters/${editingId}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            },
          )
        : await api<{ id: string }>("/api/backend/structure/service-charters", {
            method: "POST",
            body: JSON.stringify({
              ...payload,
              parentId: form.parentId || undefined,
            }),
          });
      if (form.online && form.officialIconFile) {
        const upload = new FormData();
        upload.append("file", form.officialIconFile);
        await api(`/api/backend/structure/service-charters/${entity.id}/icon`, {
          method: "POST",
          body: upload,
        });
      }
      return entity;
    },
    onSuccess: () => {
      setFormOpen(false);
      setDuplicating(false);
      setEditingId(null);
      setFormError("");
      setForm(emptyCharterForm(activeCategoryId));
      client.invalidateQueries({ queryKey: ["service-charters"] });
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar o serviço. Revise os campos e tente novamente.",
      );
    },
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      api<{
        action: "deleted" | "inactivated" | "already_inactive";
        message: string;
      }>(`/api/backend/structure/service-charters/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (result) => {
      setActionMessage(result.message);
      client.invalidateQueries({ queryKey: ["service-charters"] });
    },
    onError: (error) => {
      setActionMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível excluir o serviço.",
      );
    },
  });
  const reactivateMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/backend/structure/service-charters/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACTIVE" }),
      }),
    onSuccess: () => {
      setActionMessage("Serviço reativado.");
      client.invalidateQueries({ queryKey: ["service-charters"] });
    },
    onError: (error) => {
      setActionMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível reativar o serviço.",
      );
    },
  });
  const reparentMutation = useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      api(`/api/backend/structure/service-charters/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ parentId }),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["service-charters"] });
    },
  });
  const categoryTree = chartersForCategory(query.data ?? [], activeCategoryId);
  const allRows = flattenCharters(categoryTree);
  const normalizeCharterName = (name: string) =>
    name
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("pt-BR");
  const duplicateNameKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { node } of allRows) {
      const key = normalizeCharterName(node.name);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return new Set(
      [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([key]) => key),
    );
  }, [allRows]);
  const duplicateCount = useMemo(() => {
    return allRows.filter(({ node }) =>
      duplicateNameKeys.has(normalizeCharterName(node.name)),
    ).length;
  }, [allRows, duplicateNameKeys]);
  const removeCharter = async (charter: Charter) => {
    const ok = await confirm({
      title: "Excluir serviço",
      message:
        listStatus === "ACTIVE"
          ? `Excluir "${charter.name}"? Se já existir processo vinculado, o serviço será apenas inativado.`
          : `Excluir definitivamente "${charter.name}"? Se ainda houver vínculo, permanecerá inativo.`,
      confirmLabel: "Excluir",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;
    setActionMessage("");
    removeMutation.mutate(charter.id);
  };
  const reactivateCharter = async (charter: Charter) => {
    const ok = await confirm({
      title: "Reativar serviço",
      message: `Reativar "${charter.name}" na lista de ativos?`,
      confirmLabel: "Reativar",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;
    setActionMessage("");
    reactivateMutation.mutate(charter.id);
  };
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filteredTree = normalizedSearch
    ? filterCharterTree(categoryTree, normalizedSearch)
    : categoryTree;
  const rows = flattenCharters(filteredTree, 0, collapsed);
  const draggedCharterIds = useMemo(
    () =>
      new Set(
        draggedCharter
          ? flattenCharters([draggedCharter]).map(({ node }) => node.id)
          : [],
      ),
    [draggedCharter],
  );
  const finishCharterDrag = () => {
    setDraggedCharter(null);
    setCharterDropTargetId(null);
  };
  const reparentCharter = useCallback(
    (charter: Charter, parentId: string | null) => {
      if (charter.parentId !== parentId && !reparentMutation.isPending) {
        reparentMutation.mutate({ id: charter.id, parentId });
      }
    },
    [reparentMutation],
  );
  const duplicateCharter = (charter: Charter) => {
    setFormError("");
    setSelectedCategoryId(charter.taxonomyContextId ?? activeCategoryId);
    setForm(
      charterToFormState(
        charter,
        charter.taxonomyContextId ?? activeCategoryId,
        `${charter.name} (cópia)`,
      ),
    );
    setEditingId(null);
    setDuplicating(true);
    setFormOpen(true);
  };
  const editCharter = (charter: Charter) => {
    setFormError("");
    setSelectedCategoryId(charter.taxonomyContextId ?? activeCategoryId);
    setForm(
      charterToFormState(
        charter,
        charter.taxonomyContextId ?? activeCategoryId,
      ),
    );
    setDuplicating(false);
    setEditingId(charter.id);
    setFormOpen(true);
  };
  const excludedParentIds = useMemo(() => {
    if (!editingId) return new Set<string>();
    const editingNode = allRows.find(({ node }) => node.id === editingId)?.node;
    return editingNode ? charterSubtreeIds(editingNode) : new Set([editingId]);
  }, [allRows, editingId]);
  const parentCharterOptions = allRows
    .map(({ node }) => node)
    .filter((node) => !excludedParentIds.has(node.id));
  useEffect(() => {
    if (!draggedCharter || !canManage) return;

    const move = (event: PointerEvent) => {
      charterPointerMovedRef.current = true;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const target = element?.closest<HTMLElement>("[data-charter-drop-id]");
      const targetId = target?.dataset.charterDropId;
      if (targetId && !draggedCharterIds.has(targetId)) {
        setCharterDropTargetId(targetId);
      } else if (element?.closest("[data-charter-root-dropzone]")) {
        setCharterDropTargetId("root");
      } else {
        setCharterDropTargetId(null);
      }
    };
    const end = () => {
      if (!charterPointerMovedRef.current) {
        finishCharterDrag();
        return;
      }
      if (charterDropTargetId === "root" || charterDropTargetId === null) {
        reparentCharter(draggedCharter, null);
      } else if (
        charterDropTargetId &&
        !draggedCharterIds.has(charterDropTargetId)
      ) {
        reparentCharter(draggedCharter, charterDropTargetId);
      }
      finishCharterDrag();
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", end, { once: true });
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", end);
    };
  }, [
    canManage,
    charterDropTargetId,
    draggedCharter,
    draggedCharterIds,
    reparentCharter,
    reparentMutation.isPending,
  ]);
  const changeCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setForm((current) => ({
      ...current,
      taxonomyContextId: categoryId,
    }));
  };
  if (formOpen)
    return (
      <ServiceCharterForm
        form={form}
        duplicate={duplicating}
        editing={Boolean(editingId)}
        setForm={setForm}
        charters={parentCharterOptions}
        categories={categoryRows}
        selectedCategoryId={activeCategoryId}
        onCategoryChange={changeCategory}
        sectors={sectorRows}
        fileNames={fileNames.data ?? []}
        onCancel={() => {
          setFormOpen(false);
          setDuplicating(false);
          setEditingId(null);
          setFormError("");
        }}
        onSave={() => mutation.mutate()}
        pending={mutation.isPending}
        error={mutation.isError}
        formError={formError}
      />
    );
  return (
    <>
      <h1 className="admin-title dense-title">
        <FileText size={18} /> Catálogo de serviços
      </h1>
      {categories.isError ? (
        <p className="charter-category-hint" role="alert">
          Não foi possível carregar as categorias.
        </p>
      ) : !categories.isLoading && !categoryRows.length ? (
        <p className="charter-category-hint" role="status">
          As categorias oficiais do sistema não foram carregadas. Atualize a
          página ou procure o suporte da plataforma.
        </p>
      ) : (
        <p>
          {(normalizedSearch ? rows : allRows).length} serviço(s){" "}
          {listStatus === "ACTIVE" ? "ativo(s)" : "inativo(s)"} nesta categoria
        </p>
      )}
      {listStatus === "ACTIVE" && duplicateCount > 0 && (
        <p className="charter-category-hint" role="status">
          {duplicateCount} serviço(s) com nome duplicado nesta categoria
          (destacados em âmbar). Revise e exclua as cópias desnecessárias.
        </p>
      )}
      {actionMessage && (
        <p className="charter-category-hint" role="status">
          {actionMessage}
        </p>
      )}
      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchLabel="Buscar serviços"
        actions={
          <>
            <div className="admin-status-toggle" role="group" aria-label="Situação">
              <button
                type="button"
                className={listStatus === "ACTIVE" ? "is-active" : undefined}
                onClick={() => {
                  setListStatus("ACTIVE");
                  setActionMessage("");
                }}
              >
                Ativos
              </button>
              <button
                type="button"
                className={listStatus === "INACTIVE" ? "is-active" : undefined}
                onClick={() => {
                  setListStatus("INACTIVE");
                  setActionMessage("");
                }}
              >
                Inativos
              </button>
            </div>
            <FilterPillSelect
              label="Categoria"
              hideLabel
              value={activeCategoryId}
              disabled={!categoryRows.length}
              className="sd-pill-select admin-toolbar-pill"
              emptyHint="Nenhuma categoria cadastrada"
              onChange={changeCategory}
              options={
                categoryRows.length
                  ? categoryRows.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))
                  : [{ value: "", label: "Nenhuma categoria cadastrada" }]
              }
            />
            <button
              type="button"
              className="admin-action-add"
              disabled={!canManage || !activeCategoryId || listStatus !== "ACTIVE"}
              onClick={() => {
                setFormError("");
                setForm(emptyCharterForm(activeCategoryId));
                setDuplicating(false);
                setEditingId(null);
                setFormOpen(true);
              }}
            >
              Adicionar serviço
            </button>
          </>
        }
      />
      <LoadingError loading={query.isLoading} error={query.isError} />
      {reparentMutation.isError && (
        <p className="inline-error" role="alert">
          Não foi possível reorganizar o serviço.
        </p>
      )}
      <HierarchyTable>
        {draggedCharter && (
          <div
            data-charter-root-dropzone
            className={`sector-root-dropzone ${charterDropTargetId === "root" ? "active" : ""}`}
          >
            Solte aqui para remover o serviço agrupador
          </div>
        )}
        <table className="admin-data-table charter-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Unidade responsável</th>
              <th>Documentos exigidos</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ node, depth }) => {
              const isDuplicate = duplicateNameKeys.has(
                normalizeCharterName(node.name),
              );
              return (
              <tr
                key={node.id}
                data-charter-drop-id={node.id}
                className={[
                  draggedCharter?.id === node.id
                    ? "sector-row-dragging"
                    : charterDropTargetId === node.id
                      ? "sector-row-drop-target"
                      : undefined,
                  isDuplicate ? "charter-row-duplicate" : undefined,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined}
              >
                <td>
                  <HierarchyConnector depth={depth}>
                    {canManage && listStatus === "ACTIVE" && (
                      <span
                        className="sector-drag-handle"
                        aria-label={`Arrastar ${node.name}`}
                        title={`Arrastar ${node.name}`}
                        onPointerDown={(event) => {
                          if (reparentMutation.isPending) {
                            event.preventDefault();
                            return;
                          }
                          event.preventDefault();
                          charterPointerMovedRef.current = false;
                          setDraggedCharter(node);
                        }}
                      >
                        <GripVertical size={16} aria-hidden />
                      </span>
                    )}
                    {node.children?.length ? (
                      <TreeToggle
                        label={node.name}
                        collapsed={collapsed.has(node.id)}
                        onToggle={() =>
                          setCollapsed((current) =>
                            toggleCollapsedId(current, node.id),
                          )
                        }
                      />
                    ) : (
                      <span className="tree-toggle-placeholder" />
                    )}
                    {node.name}
                    {isDuplicate && (
                      <span className="charter-duplicate-badge">Duplicado</span>
                    )}
                  </HierarchyConnector>
                </td>
                <td>{node.sector?.name ?? "Não vinculada"}</td>
                <td>
                  {node.fileNames?.length
                    ? node.fileNames
                        .map(
                          (item) =>
                            `${item.fileName.name} (${item.required ? "obrigatório" : "opcional"})`,
                        )
                        .join(", ")
                    : "Nenhum"}
                </td>
                <td>
                  <div className="compact-admin-actions">
                    {listStatus === "ACTIVE" ? (
                      <>
                        <button
                          type="button"
                          className="action-edit"
                          disabled={!canManage}
                          title={
                            canManage
                              ? `Editar ${node.name}`
                              : "Sem permissão para editar"
                          }
                          aria-label={`Editar ${node.name}`}
                          onClick={() => editCharter(node)}
                        >
                          <Edit3 size={16} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="action-duplicate"
                          disabled={!canManage}
                          title={`Duplicar ${node.name}`}
                          aria-label={`Duplicar ${node.name}`}
                          onClick={() => duplicateCharter(node)}
                        >
                          <Copy size={16} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="action-delete"
                          disabled={!canManage || removeMutation.isPending}
                          title={`Excluir ${node.name}`}
                          aria-label={`Excluir ${node.name}`}
                          onClick={() => void removeCharter(node)}
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="action-edit"
                          disabled={!canManage || reactivateMutation.isPending}
                          title={`Reativar ${node.name}`}
                          aria-label={`Reativar ${node.name}`}
                          onClick={() => void reactivateCharter(node)}
                        >
                          <RotateCcw size={16} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="action-delete"
                          disabled={!canManage || removeMutation.isPending}
                          title={`Excluir ${node.name}`}
                          aria-label={`Excluir ${node.name}`}
                          onClick={() => void removeCharter(node)}
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="empty-row">
                  {listStatus === "ACTIVE"
                    ? "Nenhum serviço nesta categoria."
                    : "Nenhum serviço inativo nesta categoria."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </HierarchyTable>
    </>
  );
}

const SERVICE_FORM_FIELD_OPTIONS: Array<{
  value: ServiceFormFieldType;
  label: string;
}> = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Numérico" },
  { value: "phone", label: "Telefone" },
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "cep", label: "CEP integrado" },
  { value: "email", label: "E-mail" },
];

function ServiceFormBuilder({
  serviceName,
  fields,
  onChange,
  onBack,
}: {
  serviceName: string;
  fields: ServiceFormField[];
  onChange: (fields: ServiceFormField[]) => void;
  onBack: () => void;
}) {
  const updateField = (id: string, patch: Partial<ServiceFormField>) =>
    onChange(
      fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    );
  const moveField = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= fields.length) return;
    const next = [...fields];
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(next.map((field, sortOrder) => ({ ...field, sortOrder })));
  };
  const invalid = fields.some((field) => !field.label.trim());

  return (
    <section
      className="sd-create-page subject-form-builder"
      aria-label="Construtor do formulário do serviço"
    >
      <AdminBackButton onClick={onBack}>
        Voltar à criação do serviço
      </AdminBackButton>
      <header className="sd-create-header">
        <span>Formulário de solicitação</span>
        <h1>Criar formulário</h1>
        <p>
          Configure os dados que serão solicitados em{" "}
          {serviceName || "este serviço"}.
        </p>
      </header>

      <div className="subject-form-toolbar">
        <button
          className="admin-button"
          type="button"
          disabled={fields.length >= 100}
          onClick={() =>
            onChange([
              ...fields,
              {
                id: createClientId(),
                label: "",
                type: "text",
                placeholder: "",
                required: false,
                sortOrder: fields.length,
              },
            ])
          }
        >
          Adicionar campo
        </button>
        <span className="admin-count">{fields.length} campo(s)</span>
      </div>

      {!fields.length && (
        <p className="sd-form-hint">
          Adicione o primeiro campo para começar o formulário.
        </p>
      )}
      <ol className="subject-form-items service-form-fields">
        {fields.map((field, index) => (
          <li key={field.id} className="open">
            <div className="subject-form-item-summary">
              <span>
                {index + 1}. {field.label || "Novo campo"}
              </span>
              <span className="muted">
                {SERVICE_FORM_FIELD_OPTIONS.find(
                  (option) => option.value === field.type,
                )?.label ?? field.type}
                {" · "}
                {field.required ? "Obrigatório" : "Opcional"}
              </span>
            </div>
            <div className="subject-form-item-editor">
              <div className="sd-form-grid">
                <label className="sd-field">
                  Nome do campo *
                  <input
                    required
                    maxLength={200}
                    value={field.label}
                    placeholder="Ex.: Nome da mãe"
                    onChange={(event) =>
                      updateField(field.id, { label: event.target.value })
                    }
                  />
                </label>
                <label className="sd-field">
                  Formato
                  <FilterPillSelect
                    label="Formato"
                    hideLabel
                    value={field.type}
                    className="sd-pill-select"
                    onChange={(next) =>
                      updateField(field.id, {
                        type: next as ServiceFormFieldType,
                      })
                    }
                    options={SERVICE_FORM_FIELD_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                  />
                </label>
                <label className="sd-field sd-field-wide">
                  Texto de exemplo
                  <input
                    maxLength={200}
                    value={field.placeholder ?? ""}
                    placeholder="Ex.: Digite a informação solicitada"
                    onChange={(event) =>
                      updateField(field.id, {
                        placeholder: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="sd-option-card">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) =>
                      updateField(field.id, {
                        required: event.target.checked,
                      })
                    }
                  />
                  <span>
                    <strong>Campo obrigatório</strong>
                    <small>Impede o envio enquanto estiver vazio.</small>
                  </span>
                </label>
              </div>
              <div className="admin-form-actions">
                <button
                  className="light-button"
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveField(index, -1)}
                >
                  Subir
                </button>
                <button
                  className="light-button"
                  type="button"
                  disabled={index === fields.length - 1}
                  onClick={() => moveField(index, 1)}
                >
                  Descer
                </button>
                <button
                  className="danger-button"
                  type="button"
                  onClick={() =>
                    onChange(
                      fields
                        .filter((item) => item.id !== field.id)
                        .map((item, sortOrder) => ({ ...item, sortOrder })),
                    )
                  }
                >
                  Remover
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <footer className="sd-form-actions">
        <button
          className="admin-button"
          type="button"
          disabled={invalid}
          onClick={onBack}
        >
          Concluir formulário
        </button>
      </footer>
    </section>
  );
}

function OfficialServiceCharterForm({
  form,
  setForm,
  onBack,
}: {
  form: CharterFormState;
  setForm: React.Dispatch<React.SetStateAction<CharterFormState>>;
  onBack: () => void;
}) {
  const setContent = (key: string, value: string) =>
    setForm((current) => ({
      ...current,
      officialContent: { ...current.officialContent, [key]: value },
    }));

  return (
    <section className="sd-create-page">
      <AdminBackButton onClick={onBack}>
        Voltar ao cadastro do serviço
      </AdminBackButton>
      <header className="sd-create-header">
        <span>Publicação no portal</span>
        <h1>Carta de Serviço Oficial</h1>
        <p>
          Registre as informações que serão apresentadas ao cidadão no portal.
        </p>
      </header>
      <div className="sd-form">
        <fieldset className="sd-form-section">
          <legend>
            <span>01</span> Identificação e finalidade
          </legend>
          <div className="sd-form-grid">
            <label className="sd-field sd-field-wide">
              Nome do serviço *
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            {OFFICIAL_CONTENT_FIELDS.map(([key, label]) => (
              <label className="sd-field sd-field-wide" key={key}>
                {label} *
                <textarea
                  required
                  rows={3}
                  value={form.officialContent[key] ?? ""}
                  placeholder={
                    key === "deliveryChannels"
                      ? "Presencial, online, telefone, aplicativo, e-mail ou outros canais."
                      : undefined
                  }
                  onChange={(event) => setContent(key, event.target.value)}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="sd-form-section">
          <legend>
            <span>02</span> Ícone do serviço
          </legend>
          <label className="sd-field">
            Arquivo do ícone
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  officialIconFile: event.target.files?.[0] ?? null,
                }))
              }
            />
            <small>PNG, JPEG ou WebP; máximo de 2 MB.</small>
          </label>
        </fieldset>
        <footer className="sd-form-actions">
          <button className="admin-button" type="button" onClick={onBack}>
            Concluir Carta de Serviço
          </button>
        </footer>
      </div>
    </section>
  );
}

export function ServiceCharterForm({
  form,
  duplicate = false,
  editing = false,
  setForm,
  charters,
  categories,
  selectedCategoryId,
  onCategoryChange,
  sectors,
  fileNames,
  onSave,
  onCancel,
  pending,
  error,
  formError,
}: {
  form: CharterFormState;
  duplicate?: boolean;
  editing?: boolean;
  setForm: React.Dispatch<React.SetStateAction<CharterFormState>>;
  charters: Charter[];
  categories: OfficialCategory[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  sectors: SectorOption[];
  fileNames: AttachmentFileName[];
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
  error: boolean;
  formError?: string;
}) {
  const [formBuilderOpen, setFormBuilderOpen] = useState(false);
  const [officialOpen, setOfficialOpen] = useState(false);
  const set = (
    key: Exclude<
      keyof CharterFormState,
      | "subjectIds"
      | "attachmentFileNameIds"
      | "requiredAttachmentFileNameIds"
      | "formFields"
      | "officialContent"
      | "officialIconFile"
    >,
    value: string | boolean,
  ) => setForm((current) => ({ ...current, [key]: value }));
  const toggleFileName = (id: string) =>
    setForm((current) => ({
      ...current,
      attachmentFileNameIds: current.attachmentFileNameIds.includes(id)
        ? current.attachmentFileNameIds.filter((item) => item !== id)
        : [...current.attachmentFileNameIds, id],
      requiredAttachmentFileNameIds: current.attachmentFileNameIds.includes(id)
        ? current.requiredAttachmentFileNameIds.filter((item) => item !== id)
        : current.requiredAttachmentFileNameIds,
    }));
  const setFileNameRequired = (id: string, required: boolean) =>
    setForm((current) => ({
      ...current,
      requiredAttachmentFileNameIds: required
        ? [...new Set([...current.requiredAttachmentFileNameIds, id])]
        : current.requiredAttachmentFileNameIds.filter((item) => item !== id),
    }));
  if (formBuilderOpen) {
    return (
      <ServiceFormBuilder
        serviceName={form.name}
        fields={form.formFields}
        onChange={(formFields) =>
          setForm((current) => ({ ...current, formFields }))
        }
        onBack={() => setFormBuilderOpen(false)}
      />
    );
  }
  if (officialOpen) {
    return (
      <OfficialServiceCharterForm
        form={form}
        setForm={setForm}
        onBack={() => setOfficialOpen(false)}
      />
    );
  }
  return (
    <section className="sd-create-page">
      <AdminBackButton onClick={onCancel}>
        Voltar ao catálogo de serviços
      </AdminBackButton>
      <header className="sd-create-header">
        <span>Configuração do portal</span>
        <h1>
          {editing
            ? "Editar serviço"
            : duplicate
              ? "Duplicar serviço"
              : "Novo serviço"}
        </h1>
        <p>
          Defina como o serviço será organizado, apresentado e disponibilizado.
        </p>
      </header>
      <form
        className="sd-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <fieldset className="sd-form-section">
          <legend>
            <span>01</span>
            Organização
          </legend>
          <p>
            Escolha onde o serviço ficará disponível e quem será responsável.
          </p>
          <div className="sd-form-grid">
            <label className="sd-field">
              Categoria oficial *
              <FilterPillSelect
                label="Categoria do serviço"
                hideLabel
                required
                value={selectedCategoryId}
                className="sd-pill-select"
                onChange={onCategoryChange}
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
              />
              <small>
                A categoria permanece selecionada ao criar outros serviços.
              </small>
            </label>
            <label className="sd-field">
              Unidade responsável *
              <FilterPillSelect
                label="Unidade responsável"
                hideLabel
                required
                searchable
                searchPlaceholder="Buscar por sigla ou nome"
                value={form.sectorId}
                className="sd-pill-select"
                placeholder="Selecione a unidade"
                onChange={(next) => set("sectorId", next)}
                options={[
                  { value: "", label: "Selecione a unidade" },
                  ...sectors.map((sector) => ({
                    value: sector.id,
                    label: `${sector.code} — ${sector.name}`,
                  })),
                ]}
              />
            </label>
            <label className="sd-field">
              Agrupar dentro de
              <FilterPillSelect
                label="Agrupar dentro de"
                hideLabel
                searchable
                searchPlaceholder="Buscar por sigla ou nome"
                value={form.parentId}
                className="sd-pill-select"
                placeholder="Nenhum serviço agrupador"
                onChange={(next) => set("parentId", next)}
                options={[
                  { value: "", label: "Nenhum serviço agrupador" },
                  ...charters.map((row) => ({
                    value: row.id,
                    label: row.name,
                  })),
                ]}
              />
              <small>
                Use apenas quando este serviço fizer parte de outro.
              </small>
            </label>
          </div>
        </fieldset>

        <fieldset className="sd-form-section">
          <legend>
            <span>02</span>
            Apresentação
          </legend>
          <p>Escreva um título direto e explique o atendimento ao usuário.</p>
          <div className="sd-form-grid">
            <label className="sd-field sd-field-wide">
              Nome do serviço *
              <input
                required
                maxLength={200}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <label className="sd-field">
              Identificador visual
              <input
                placeholder="Ex.: atendimento"
                value={form.icon}
                onChange={(e) => set("icon", e.target.value)}
              />
              <small>
                Opcional. Use uma palavra curta para identificar o ícone.
              </small>
            </label>
            <label className="sd-field sd-field-full">
              Orientações para o usuário *
              <textarea
                required
                rows={7}
                placeholder="Explique o que é o serviço, quem pode solicitar e o que será necessário."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="sd-form-section">
          <legend>
            <span>03</span>
            Formulário de solicitação
          </legend>
          <p>
            Crie campos próprios para coletar os dados necessários ao
            atendimento.
          </p>
          <div className="service-form-config">
            <label className="sd-option-card">
              <input
                type="checkbox"
                checked={form.customFormEnabled}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  set("customFormEnabled", enabled);
                  if (enabled) setFormBuilderOpen(true);
                }}
              />
              <span>
                <strong>Criar formulário para este serviço</strong>
                <small>
                  Adicione campos de texto, números, documentos, contato e CEP.
                </small>
              </span>
            </label>
            {form.customFormEnabled && (
              <div className="service-form-config-summary">
                <span>
                  <strong>
                    {form.formFields.length} campo(s) configurado(s)
                  </strong>
                  <small>
                    {form.formFields.filter((field) => field.required).length}{" "}
                    obrigatório(s)
                  </small>
                </span>
                <button
                  className="admin-button secondary"
                  type="button"
                  onClick={() => setFormBuilderOpen(true)}
                >
                  {form.formFields.length
                    ? "Editar formulário"
                    : "Montar formulário"}
                </button>
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className="sd-form-section">
          <legend>
            <span>04</span>
            Documentos exigidos
          </legend>
          <p>
            Selecione os documentos aceitos e defina quais são obrigatórios.
          </p>
          {fileNames.length ? (
            <div
              className="sd-option-grid"
              aria-label="Nomes de arquivo exigidos"
            >
              {fileNames.map((fileName) => (
                <div
                  className="sd-option-card service-file-option"
                  key={fileName.id}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={form.attachmentFileNameIds.includes(fileName.id)}
                      onChange={() => toggleFileName(fileName.id)}
                    />
                    <span>
                      <strong>{fileName.name}</strong>
                      <small>Incluir este documento no serviço.</small>
                    </span>
                  </label>
                  <span>
                    <label>
                      Exigência
                      <FilterPillSelect
                        label={`Exigência de ${fileName.name}`}
                        hideLabel
                        disabled={
                          !form.attachmentFileNameIds.includes(fileName.id)
                        }
                        className="sd-pill-select"
                        value={
                          form.requiredAttachmentFileNameIds.includes(
                            fileName.id,
                          )
                            ? "required"
                            : "optional"
                        }
                        onChange={(next) =>
                          setFileNameRequired(fileName.id, next === "required")
                        }
                        options={[
                          { value: "optional", label: "Opcional" },
                          { value: "required", label: "Obrigatório" },
                        ]}
                      />
                    </label>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="sd-form-hint">
              Nenhum nome de arquivo cadastrado. Cadastre em Administração ·
              Nomes de arquivo para exigir documentos neste serviço.
            </p>
          )}
        </fieldset>

        <fieldset className="sd-form-section">
          <legend>
            <span>05</span>
            Publicação
          </legend>
          <p>Controle a presença e a prioridade deste serviço no portal.</p>
          <div className="sd-option-grid">
            <label className="sd-option-card">
              <input
                type="checkbox"
                checked={form.online}
                onChange={(event) => {
                  set("online", event.target.checked);
                  if (event.target.checked) setOfficialOpen(true);
                  else set("featuredTerm", "");
                }}
              />
              <span>
                <strong>Disponível no portal</strong>
                <small>
                  Permite que o público encontre e solicite o serviço.
                </small>
              </span>
            </label>
            <label className="sd-option-card">
              <input
                type="checkbox"
                checked={Boolean(form.featuredTerm)}
                onChange={(e) =>
                  set("featuredTerm", e.target.checked ? "Destaque" : "")
                }
              />
              <span>
                <strong>Exibir entre os destaques</strong>
                <small>
                  Prioriza o serviço nas áreas de descoberta do portal.
                </small>
              </span>
            </label>
          </div>
          {form.online && (
            <button
              className="light-button"
              type="button"
              onClick={() => setOfficialOpen(true)}
            >
              Editar Carta de Serviço Oficial
            </button>
          )}
        </fieldset>

        {(formError || error) && (
          <p className="sd-form-error" role="alert">
            {formError ||
              (editing
                ? "Não foi possível salvar o serviço. Revise os campos e tente novamente."
                : "Não foi possível criar o serviço. Revise os campos e tente novamente.")}
          </p>
        )}
        <footer className="sd-form-actions">
          <button className="admin-button" disabled={pending}>
            {pending
              ? editing
                ? "Salvando…"
                : "Criando…"
              : editing
                ? "Salvar alterações"
                : "Criar serviço"}
          </button>
          <button type="button" className="light-button" onClick={onCancel}>
            Cancelar
          </button>
        </footer>
      </form>
    </section>
  );
}

export function RolesPage() {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const query = useQuery({
    queryKey: ["document-roles"],
    queryFn: () => api<Role[]>("/api/backend/structure/document-roles"),
  });
  return (
    <>
      <h1 className="admin-title dense-title">
        <FileText size={18} /> Funções documentais
      </h1>
      <p>{query.data?.length ?? 0} função(ões) documental(is)</p>
      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchLabel="Buscar funções documentais"
        actions={
          <>
            <button
              className="admin-button"
              disabled
              title="Formulário em breve nesta versão"
            >
              Adicionar função
            </button>
          </>
        }
      />
      <LoadingError loading={query.isLoading} error={query.isError} />
      <table className="admin-data-table roles-table">
        <thead>
          <tr>
            <th>Função documental</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {query.data
            ?.filter((row) =>
              row.name
                .toLocaleLowerCase("pt-BR")
                .includes(search.trim().toLocaleLowerCase("pt-BR")),
            )
            .map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>
                  <button disabled>Editar</button>
                </td>
              </tr>
            ))}
          {!query.data?.length && (
            <tr>
              <td colSpan={2} className="empty-row">
                Nenhuma função documental habilitada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

export function AdminStructurePage({ section }: { section: string }) {
  const { data: user } = useCurrentUser();
  if (!user) return <p>Carregando...</p>;
  const requiredPermissions: Record<string, string[]> = {
    modelos: ["templates.manage", "templates.manage_sector"],
    "listas-assinantes": ["signer_lists.manage"],
    "listas-envio": ["send_lists.manage"],
    "carta-servico": ["service_charters.manage"],
    papeis: ["document_roles.manage"],
  };
  const allowed = requiredPermissions[section]?.some((permission) =>
    user.permissions.includes(permission),
  );
  if (!allowed)
    return (
      <p className="inline-error">
        Você não possui permissão para acessar esta preferência.
      </p>
    );
  const pages: Record<string, React.ReactNode> = {
    modelos: <TemplatesPage />,
    "listas-assinantes": <SignerListsPage />,
    "listas-envio": <SendListsPage />,
    "carta-servico": <ServiceChartersPage />,
    papeis: <RolesPage />,
  };
  return (
    <section className="admin-container">
      <div className="admin-content">{pages[section]}</div>
    </section>
  );
}

export function ContactsPage() {
  const [search, setSearch] = useState("");
  const [listId, setListId] = useState("");
  const [type, setType] = useState("");
  const lists = useQuery({
    queryKey: ["person-lists"],
    queryFn: () => api<PersonList[]>("/api/backend/structure/person-lists"),
  });
  const people = useQuery({
    queryKey: ["persons", search, listId, type],
    queryFn: () =>
      api<Person[]>(
        `/api/backend/structure/persons?search=${encodeURIComponent(search)}${listId ? `&listId=${listId}` : ""}${type ? `&type=${type}` : ""}`,
      ),
  });
  return (
    <section className="contacts-layout">
      <aside className="contacts-sidebar">
        <strong>Todos {people.data?.length ?? 0}</strong>
        <h3>Listas:</h3>
        {lists.data?.map((list) => (
          <button
            className={listId === list.id ? "active" : ""}
            key={list.id}
            onClick={() => setListId(listId === list.id ? "" : list.id)}
          >
            {list.name}
          </button>
        ))}
        <button
          className={!listId ? "active" : ""}
          onClick={() => setListId("")}
        >
          Em nenhuma lista
        </button>
      </aside>
      <div className="contacts-main">
        <div className="contacts-toolbar">
          <FilterPillSelect
            label="Tipo"
            hideLabel
            value={type}
            onChange={setType}
            placeholder="Tudo"
            className="contacts-type-filter"
            options={[
              { value: "", label: "Tudo" },
              { value: "PERSON", label: "Pessoa física" },
              { value: "COMPANY", label: "Pessoa jurídica" },
            ]}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(
                (new FormData(e.currentTarget).get("search") as string) ?? "",
              );
            }}
          >
            <input name="search" placeholder="Buscar contato" />
            <button className="blue-button">OK</button>
          </form>
        </div>
        <LoadingError loading={people.isLoading} error={people.isError} />
        <table className="admin-data-table contacts-table">
          <thead>
            <tr>
              <th></th>
              <th>Nome</th>
              <th>Listas</th>
              <th>Interações</th>
              <th>Logins</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {people.data?.map((person) => (
              <tr key={person.id}>
                <td>
                  <input
                    type="checkbox"
                    disabled
                    aria-label={`Selecionar ${person.name}`}
                  />
                </td>
                <td>
                  <strong>{person.name}</strong>
                  <small>
                    {person.email ?? "Sem e-mail"} ·{" "}
                    {person.type === "COMPANY"
                      ? "Pessoa jurídica"
                      : "Pessoa física"}{" "}
                    · documento protegido
                  </small>
                </td>
                <td>
                  {person.memberships
                    .map((item) => item.personList.name)
                    .join(", ") || "Nenhuma"}
                </td>
                <td>{person.interactionsCount ?? 0}</td>
                <td>{person.loginCount ?? 0}</td>
                <td>
                  <button disabled>Editar</button>
                </td>
              </tr>
            ))}
            {!people.data?.length && (
              <tr>
                <td colSpan={6} className="empty-row">
                  Nenhum contato encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <PaginationCompact />
      </div>
    </section>
  );
}

export function SignatureQueuePage() {
  const client = useQueryClient();
  const { confirm, prompt } = useDialog();
  const [status, setStatus] = useState<Signature["status"]>("PENDING");
  const [selected, setSelected] = useState<string[]>([]);
  const query = useQuery({
    queryKey: ["signatures", status],
    queryFn: () =>
      api<Signature[]>(`/api/backend/me/signatures?status=${status}`),
  });
  const rows = query.data ?? [];
  const respond = useMutation({
    mutationFn: async ({
      action,
      reason,
      token,
      ids,
    }: {
      action: "sign" | "reject";
      reason?: string;
      token?: string;
      ids: string[];
    }) => {
      const pendingIds = rows
        .filter((row) => row.status === "PENDING" && ids.includes(row.id))
        .map((row) => row.id);
      await Promise.all(
        pendingIds.map((id) =>
          api(`/api/backend/me/signatures/${id}/${action}`, {
            method: "POST",
            body: JSON.stringify(
              action === "reject" ? { reason } : { confirmation: true, token },
            ),
          }),
        ),
      );
    },
    onSuccess: async () => {
      setSelected([]);
      await client.invalidateQueries({ queryKey: ["signatures"] });
    },
  });
  const pendingSelected = rows.some(
    (row) => row.status === "PENDING" && selected.includes(row.id),
  );
  const rejectIds = (ids: string[]) => {
    void (async () => {
      const reason = await prompt({
        title: "Recusar assinatura",
        message:
          ids.length > 1
            ? "Informe o motivo da recusa dos itens selecionados."
            : "Informe o motivo da recusa desta solicitação.",
        inputLabel: "Motivo",
        inputPlaceholder: "Descreva o motivo…",
        confirmLabel: "Recusar",
        cancelLabel: "Cancelar",
        tone: "danger",
      });
      if (reason?.trim()) {
        respond.mutate({ action: "reject", reason: reason.trim(), ids });
      }
    })();
  };
  const rejectSelected = () => rejectIds(selected);
  const signIds = (ids: string[]) => {
    void (async () => {
      const ok = await confirm({
        title: "Assinar documentos",
        message:
          ids.length > 1
            ? "Declaro que conferi os arquivos selecionados e manifesto minha assinatura eletrônica. Deseja continuar?"
            : "Declaro que conferi o arquivo e manifesto minha assinatura eletrônica. Deseja continuar?",
        confirmLabel: "Continuar",
        cancelLabel: "Cancelar",
      });
      if (!ok) return;
      const token = await prompt({
        title: "Verificação em duas etapas",
        message:
          "Digite o código de 6 números da sua verificação em duas etapas.",
        inputLabel: "Código",
        inputPlaceholder: "000000",
        confirmLabel: "Assinar",
        cancelLabel: "Cancelar",
      });
      if (!token) return;
      if (!token.trim().match(/^\d{6}$/)) {
        await confirm({
          title: "Código inválido",
          message: "Informe um código numérico de 6 dígitos para continuar.",
          confirmLabel: "Entendi",
          cancelLabel: "Fechar",
        });
        return;
      }
      respond.mutate({ action: "sign", token: token.trim(), ids });
    })();
  };
  const signSelected = () => signIds(selected);
  return (
    <section className="notifications-page signatures-page">
      <header className="signatures-page-header">
        <div className="signatures-page-heading">
          <h1>Assinaturas pendentes</h1>
          <p>Confira e responda às solicitações da sua fila.</p>
        </div>
        <div className="notification-toolbar">
          <FilterPillSelect
            label="Situação"
            value={status}
            className="signature-filter"
            onChange={(value) => {
              setStatus(value as Signature["status"]);
              setSelected([]);
            }}
            options={[
              { value: "PENDING", label: "Pendente" },
              { value: "SIGNED", label: "Assinado" },
              { value: "REJECTED", label: "Recusado" },
            ]}
          />
          <span className="signature-queue-chip">Minha fila de assinaturas</span>
        </div>
      </header>
      <div className="signature-actions">
        <button
          type="button"
          disabled={!pendingSelected || respond.isPending}
          className="signature-action-primary"
          onClick={signSelected}
        >
          <PenLine size={16} aria-hidden />
          Assinar com verificação
        </button>
        <button
          type="button"
          disabled={!pendingSelected || respond.isPending}
          className="signature-action-danger"
          onClick={rejectSelected}
        >
          Rejeitar selecionado(s)
        </button>
      </div>
      <LoadingError loading={query.isLoading} error={query.isError} />
      {respond.isError && (
        <p className="inline-error">
          Não foi possível responder à solicitação.
        </p>
      )}
      <div className="signature-list">
        {rows.map((row) => (
          <article
            className={`signature-card status-${row.status.toLowerCase()}`}
            key={row.id}
          >
            <label className="signature-card-check">
              <input
                type="checkbox"
                aria-label={`Selecionar ${row.document.subject}`}
                checked={selected.includes(row.id)}
                disabled={row.status !== "PENDING"}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, row.id]
                      : current.filter((id) => id !== row.id),
                  )
                }
              />
            </label>
            <div className="signature-card-icon" aria-hidden>
              <PenLine size={18} />
            </div>
            <div className="signature-card-body">
              <div className="signature-card-top">
                <span className={`status-pill ${row.status.toLowerCase()}`}>
                  {
                    {
                      PENDING: "Pendente",
                      SIGNED: "Assinado",
                      REJECTED: "Recusado",
                    }[row.status]
                  }
                </span>
                <time dateTime={row.requestedAt}>
                  {new Date(row.requestedAt).toLocaleString("pt-BR")}
                </time>
              </div>
              <strong className="signature-card-title">
                {row.requestedBy.name} solicitou sua assinatura
              </strong>
              {row.attachment && (
                <span className="signature-attachment-name">
                  <FileText size={14} aria-hidden />
                  <span>{row.attachment.originalName}</span>
                </span>
              )}
              <Link
                className="signature-document-link"
                href={`/documentos/${row.document.id}`}
              >
                {row.document.subject}
                {row.document.number
                  ? ` · ${row.document.number}/${row.document.year}`
                  : ""}
              </Link>
              {(row.message || row.document.body) && (
                <SignatureMessagePreview
                  raw={row.message || row.document.body || ""}
                />
              )}
              {row.rejectionReason && (
                <p className="signature-card-reason">
                  Motivo da recusa: {row.rejectionReason}
                </p>
              )}
              {row.status === "SIGNED" && row.verificationCode && (
                <small className="signature-card-meta">
                  {row.signatureProvider === "GOVBR"
                    ? "Assinatura avançada GOV.BR"
                    : row.signatureProvider === "ICP_BRASIL"
                      ? "Assinatura qualificada ICP-Brasil"
                      : "Assinatura avançada SD_Docs"}{" "}
                  ·{" "}
                  <Link href={`/verificar-assinatura/${row.verificationCode}`}>
                    validar {row.verificationCode}
                  </Link>
                </small>
              )}
              <div className="signature-card-footer">
                <small className="signature-card-requester">
                  Solicitante: {row.requestedBy.name}
                </small>
                {row.status === "PENDING" && (
                  <div className="signature-card-actions">
                    <button
                      type="button"
                      className="signature-card-action primary"
                      disabled={respond.isPending}
                      onClick={() => signIds([row.id])}
                    >
                      <PenLine size={14} aria-hidden />
                      Assinar
                    </button>
                    <button
                      type="button"
                      className="signature-card-action danger"
                      disabled={respond.isPending}
                      onClick={() => rejectIds([row.id])}
                    >
                      Recusar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
        {!rows.length && <Empty>Nenhuma assinatura nesta situação.</Empty>}
      </div>
    </section>
  );
}

const accountTabs = [
  ["dados", "Dados pessoais"],
  ["contrassenha", "Código de autorização"],
  ["mfa", "Verificação em duas etapas"],
  ["carreira", "Histórico de vínculos"],
  ["cursos", "Capacitação"],
] as const;

export function MyAccountPage() {
  const { data: user } = useCurrentUser();
  const [tab, setTab] = useState<(typeof accountTabs)[number][0]>("dados");
  const counterAllowed = user?.permissions.some(
    (p) => p === "counter_password.draft" || p === "counter_password.sign",
  );
  const visible = accountTabs.filter(
    ([key]) => key !== "contrassenha" || counterAllowed,
  );
  return (
    <section className="account-page">
      <h1>
        <UserRound size={18} /> Meu perfil
      </h1>
      <nav className="account-tabs">
        {visible.map(([key, label]) => (
          <button
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "dados" && <PersonalData />}{" "}
      {tab === "contrassenha" && counterAllowed && <CounterPassword />}
      {tab === "mfa" && <MfaSetup />} {tab === "carreira" && <CareerTable />}{" "}
      {tab === "cursos" && <Empty>Indisponível nesta versão</Empty>}
    </section>
  );
}

function signatureToEditorHtml(raw: string) {
  const text = raw.trim();
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\r?\n/)
    .map((line) => {
      const safe = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<p>${safe || "<br>"}</p>`;
    })
    .join("");
}

function SignatureMessagePreview({ raw }: { raw: string }) {
  const text = raw.trim();
  if (!text) return null;
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return (
      <div
        className="signature-card-message rich-preview"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }
  return <p className="signature-card-message">{text}</p>;
}

function PersonalData() {
  const client = useQueryClient();
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const query = useQuery({
    queryKey: ["account"],
    queryFn: () => api<Account>("/api/backend/me/account"),
  });
  const [draft, setDraft] = useState<Account | null>(null);
  const account = draft ?? query.data;
  const mutation = useMutation({
    mutationFn: () =>
      api<Account>("/api/backend/me/account", {
        method: "PATCH",
        body: JSON.stringify({
          name: account?.name,
          email: account?.email,
          jobTitle: account?.jobTitle ?? "",
          landline: account?.landline ?? "",
          phoneAreaCode: account?.phoneAreaCode ?? "",
          mobile: account?.mobile ?? "",
          cpf: account?.cpf ?? "",
          registration: account?.registration ?? "",
          gender: account?.gender ?? "",
          birthDate: account?.birthDate ?? "",
          currentPassword,
          ...(newPassword || newPasswordConfirm
            ? { newPassword, newPasswordConfirm }
            : {}),
          ...(account?.preferences ?? {}),
        }),
      }),
    onSuccess: (data) => {
      setDraft(data);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setFormError("");
      client.setQueryData(["account"], data);
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar os dados.",
      );
    },
  });
  const photoMutation = useMutation({
    mutationFn: (file: File) => {
      if (file.size > 20 * 1024 * 1024) {
        throw new ApiError("A foto deve ter no máximo 20 MB", 400);
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        throw new ApiError("Use uma imagem PNG, JPEG ou WebP", 400);
      }
      const body = new FormData();
      body.append("file", file);
      return api<Account>("/api/backend/me/account/avatar", {
        method: "POST",
        body,
      });
    },
    onSuccess: async (data) => {
      setPhotoError("");
      setDraft(data);
      client.setQueryData(["account"], data);
      await client.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (error) => {
      setPhotoError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível enviar a foto.",
      );
    },
  });
  if (!account)
    return <LoadingError loading={query.isLoading} error={query.isError} />;
  const update = (patch: Partial<Account>) =>
    setDraft({ ...account, ...patch });
  const pref = (patch: Partial<NonNullable<Account["preferences"]>>) =>
    update({ preferences: { ...account.preferences, ...patch } });
  const primarySector = account.userSectors.find((row) => row.isPrimary)?.sector;
  const emailModeRaw = account.preferences?.emailNotificationMode ?? "ALL";
  const emailMode =
    emailModeRaw === "SECTOR_ALL" || emailModeRaw === "ALL"
      ? "ALL"
      : emailModeRaw === "MENTIONS"
        ? "DIRECT_ONLY"
        : emailModeRaw;
  const emailOptions = [
    { value: "ALL", label: "Tudo que chegar para a unidade" },
    { value: "DIRECT_ONLY", label: "Somente enviados diretamente a mim" },
    { value: "URGENT_ONLY", label: "Somente urgentes" },
    { value: "NONE", label: "Não desejo receber avisos" },
  ] as const;

  return (
    <form
      className="account-form account-form-profile"
      onSubmit={(e) => {
        e.preventDefault();
        if (!currentPassword.trim()) {
          setFormError("Informe a senha atual para confirmar as alterações.");
          return;
        }
        if (newPassword || newPasswordConfirm) {
          if (newPassword.length < 8) {
            setFormError("A nova senha precisa ter no mínimo 8 caracteres.");
            return;
          }
          if (newPassword !== newPasswordConfirm) {
            setFormError("A confirmação da nova senha não confere.");
            return;
          }
        }
        setFormError("");
        mutation.mutate();
      }}
    >
      <div className="account-profile-main">
        <section className="account-panel account-panel-identity">
          <header className="account-panel-head">
            <Building2 size={16} aria-hidden />
            <div>
              <strong>Dados pessoais</strong>
              <p>Informações cadastrais da sua conta.</p>
            </div>
          </header>
          <div className="account-sector-card">
            <span>Unidade atual</span>
            <strong>
              {primarySector
                ? `${primarySector.code} — ${primarySector.name}`
                : "Sem unidade principal"}
            </strong>
            <small>
              Para alterar unidade ou nome cadastral, fale com a administração
              do sistema.
            </small>
          </div>

          <div className="account-sei-fields">
            <label className="account-field-full">
              Nome*
              <input
                required
                value={account.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </label>
            <label className="account-field-full">
              E-mail*
              <input
                required
                type="email"
                value={account.email}
                onChange={(e) => update({ email: e.target.value })}
              />
            </label>
            <label className="account-field-full">
              E-mail secundário
              <input
                type="email"
                placeholder="E-mail"
                value={account.preferences?.secondaryEmail ?? ""}
                onChange={(e) => pref({ secondaryEmail: e.target.value })}
              />
            </label>
            <div className="account-inline-pair">
              <label className="account-inline-pair-main">
                Função/Cargo*
                <input
                  value={account.jobTitle ?? ""}
                  onChange={(e) => update({ jobTitle: e.target.value })}
                />
              </label>
              <label className="account-inline-pair-side">
                Ramal/Telefone fixo*
                <input
                  value={account.landline ?? ""}
                  onChange={(e) => update({ landline: e.target.value })}
                />
              </label>
            </div>
            <div className="account-inline-pair account-inline-pair-phone">
              <label className="account-inline-pair-ddd">
                DDD
                <input
                  inputMode="numeric"
                  maxLength={3}
                  value={account.phoneAreaCode ?? ""}
                  onChange={(e) => update({ phoneAreaCode: e.target.value })}
                />
              </label>
              <label className="account-inline-pair-mobile">
                Celular
                <input
                  value={account.mobile ?? ""}
                  onChange={(e) => update({ mobile: e.target.value })}
                />
              </label>
              <div className="account-phone-show">
                <input
                  id="account-show-mobile"
                  type="checkbox"
                  checked={account.preferences?.showMobileInPhones ?? false}
                  onChange={(e) =>
                    pref({ showMobileInPhones: e.target.checked })
                  }
                />
                <label htmlFor="account-show-mobile">
                  Exibir nº de celular na página Telefones
                </label>
              </div>
            </div>
            <div className="account-field-row">
              <label className="account-field-grow">
                CPF
                <input
                  value={account.cpf ?? ""}
                  onChange={(e) => update({ cpf: e.target.value })}
                />
              </label>
              <label className="account-field-grow">
                Cód/Matrícula
                <input
                  placeholder="Matrícula"
                  value={account.registration ?? ""}
                  onChange={(e) => update({ registration: e.target.value })}
                />
              </label>
            </div>
            <div className="account-field-row">
              <label className="account-field-grow">
                Sexo
                <select
                  value={account.gender ?? ""}
                  onChange={(e) => update({ gender: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Outro">Outro</option>
                  <option value="Não informado">Prefiro não informar</option>
                </select>
              </label>
              <label className="account-field-grow">
                Data de nascimento
                <input
                  type="date"
                  value={account.birthDate ?? ""}
                  onChange={(e) => update({ birthDate: e.target.value })}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="account-panel account-panel-prefs">
          <header className="account-panel-head">
            <Bell size={16} aria-hidden />
            <div>
              <strong>Preferências</strong>
              <p>Notificações e opções de uso do sistema.</p>
            </div>
          </header>

          <fieldset className="account-notify-group">
            <legend>
              <Mail size={14} aria-hidden />
              Avisar em meu e-mail quando algo chegar
            </legend>
            <div className="account-radio-list account-radio-list-compact">
              {emailOptions.map((option) => (
                <label key={option.value} className="account-radio account-radio-compact">
                  <input
                    type="radio"
                    name="emailNotificationMode"
                    value={option.value}
                    checked={emailMode === option.value}
                    onChange={() =>
                      pref({ emailNotificationMode: option.value })
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="check account-check">
            <input
              type="checkbox"
              checked={account.preferences?.mentionNotification ?? false}
              onChange={(e) => pref({ mentionNotification: e.target.checked })}
            />
            <span>
              Receber e-mail quando for mencionada ou solicitada minha assinatura
            </span>
          </label>

          <div className="account-prefs-grid account-prefs-grid-2">
            <label>
              Fuso horário
              <input
                value={account.preferences?.timezone ?? "America/Sao_Paulo"}
                onChange={(e) => pref({ timezone: e.target.value })}
              />
            </label>
            <label>
              Nº de documentos por página
              <input
                type="number"
                min={5}
                max={100}
                value={account.preferences?.documentsPerPage ?? 20}
                onChange={(e) =>
                  pref({ documentsPerPage: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Editor de texto
              <FilterPillSelect
                label="Editor de texto"
                hideLabel
                value={account.preferences?.editorMode ?? "RICH_TEXT"}
                className="sd-pill-select"
                onChange={(next) => pref({ editorMode: next })}
                options={[
                  { value: "RICH_TEXT", label: "Editor avançado" },
                  { value: "PLAIN_TEXT", label: "Texto simples" },
                ]}
              />
            </label>
            <label>
              Visualização dos anexos
              <FilterPillSelect
                label="Visualização dos anexos"
                hideLabel
                value={account.preferences?.attachmentViewMode ?? "PREVIEW"}
                className="sd-pill-select"
                onChange={(next) => pref({ attachmentViewMode: next })}
                options={[
                  { value: "PREVIEW", label: "Em galeria" },
                  { value: "LIST", label: "Em lista" },
                ]}
              />
            </label>
          </div>
        </section>
      </div>

      <aside className="account-profile-side">
        <section className="account-panel account-panel-photo">
          <header className="account-panel-head">
            <ImagePlus size={16} aria-hidden />
            <div>
              <strong>Foto e assinatura</strong>
              <p>A assinatura entra pronta ao preencher documentos.</p>
            </div>
          </header>
          <div className="account-photo-block">
            <div className="account-avatar">
              {account.avatarUrl ? (
                <Image
                  src={account.avatarUrl}
                  alt={`Foto de ${account.name}`}
                  width={112}
                  height={112}
                  unoptimized
                />
              ) : (
                <UserRound aria-hidden />
              )}
            </div>
            <div className="account-photo-actions">
              <input
                ref={photoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) photoMutation.mutate(file);
                  event.target.value = "";
                }}
              />
              <button
                className="account-photo-button"
                type="button"
                disabled={photoMutation.isPending}
                onClick={() => photoInput.current?.click()}
              >
                <ImagePlus size={16} />
                {photoMutation.isPending ? "Enviando…" : "Escolher foto"}
              </button>
              <small>PNG, JPEG ou WebP · máx. 20 MB</small>
              {photoError ? (
                <span className="field-error" role="alert">
                  {photoError}
                </span>
              ) : null}
            </div>
          </div>
          <div className="account-signature-field">
            <span className="account-signature-label">
              <PenLine size={14} aria-hidden />
              Assinatura textual
            </span>
            <div className="account-signature-editor">
              <RichTextEditor
                ariaLabel="Assinatura textual"
                showLibrary={false}
                enableAi={false}
                compact
                value={signatureToEditorHtml(
                  account.preferences?.textualSignature ?? "",
                )}
                onChange={(html) => pref({ textualSignature: html })}
              />
            </div>
            <small>
              Use negrito, itálico, tamanho e fonte. O texto será inserido ao
              criar ou responder documentos.
            </small>
          </div>
        </section>

        <section className="account-panel account-panel-password">
          <header className="account-panel-head">
            <KeyRound size={16} aria-hidden />
            <div>
              <strong>Senha</strong>
              <p>Confirme com a senha atual para salvar.</p>
            </div>
          </header>
          <label>
            Senha atual*
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Senha atual"
              required
            />
          </label>
          <label>
            Nova senha
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Deixe em branco para manter"
            />
          </label>
          <label>
            Confirmação
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder="Confirmação da nova senha"
            />
          </label>
          <label className="check account-check">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            <span>Mostrar senha</span>
          </label>
          <small>Mínimo: 8 caracteres</small>
        </section>
      </aside>

      <div className="full account-form-actions">
        {mutation.isSuccess ? (
          <span className="inline-success">Dados salvos.</span>
        ) : null}
        {formError ? (
          <span className="inline-error" role="alert">
            {formError}
          </span>
        ) : null}
        <button className="admin-button" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function CounterPassword() {
  const query = useQuery({
    queryKey: ["counter-password"],
    queryFn: () =>
      api<{
        status: string;
        current: { quantity: number; consumed: number } | null;
      }>("/api/backend/me/counter-password"),
  });
  const [quantity, setQuantity] = useState(100);
  const [generated, setGenerated] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      api<{ counterPassword: string }>(
        "/api/backend/me/counter-password/generate",
        { method: "POST", body: JSON.stringify({ quantity }) },
      ),
    onSuccess: (data) => {
      setGenerated(data.counterPassword);
      query.refetch();
    },
  });
  return (
    <section className="counter-password">
      <h2>
        <KeyRound size={18} /> Gerar código de autorização
      </h2>
      <p>
        Situação atual:{" "}
        <strong>
          {query.data?.status === "ACTIVE"
            ? "ATIVO"
            : "SEM CÓDIGO DE AUTORIZAÇÃO"}
        </strong>
      </p>
      <p>
        Quantos documentos poderão ser emitidos
        <br />
        com o seu código de autorização?
      </p>
      <strong>{quantity}</strong>
      <input
        type="number"
        min={1}
        max={10000}
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      />
      {generated && (
        <div className="secret-alert" role="alert">
          <strong>Copie agora. O valor não será exibido novamente.</strong>
          <code>{generated}</code>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(generated);
              setGenerated(null);
            }}
          >
            Copiar e ocultar
          </button>
        </div>
      )}
      <div className="counter-actions">
        <button
          className="admin-button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Gerar
        </button>
      </div>
    </section>
  );
}

export function MfaSetup() {
  const client = useQueryClient();
  const account = useQuery({
    queryKey: ["account"],
    queryFn: () => api<Account>("/api/backend/me/account"),
  });
  const [setup, setSetup] = useState<{ qrCodeDataUrl: string } | null>(null);
  const [token, setToken] = useState("");
  const begin = useMutation({
    mutationFn: async () => {
      const data = await api<{ qrCodeDataUrl: string }>(
        "/api/backend/me/mfa/totp/setup",
        { method: "POST" },
      );
      return { qrCodeDataUrl: data.qrCodeDataUrl };
    },
    onSuccess: (data) => setSetup({ qrCodeDataUrl: data.qrCodeDataUrl }),
  });
  const confirm = useMutation({
    mutationFn: () =>
      api<{ enabled: boolean }>("/api/backend/me/mfa/totp/confirm", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    onSuccess: () => {
      client.setQueryData<Account>(["account"], (current) =>
        current
          ? {
              ...current,
              mfa: { enabled: true, enabledAt: new Date().toISOString() },
            }
          : current,
      );
      setSetup(null);
      setToken("");
      client.invalidateQueries({ queryKey: ["account"] });
    },
  });
  if (!account.data)
    return <LoadingError loading={account.isLoading} error={account.isError} />;
  const enabled = account.data.mfa.enabled;
  return (
    <section className="mfa-page">
      <h2>
        <ShieldCheck size={18} /> Verificação em duas etapas
      </h2>
      <p>
        Situação atual: <strong>{enabled ? "ATIVADA" : "DESATIVADA"}</strong>
      </p>
      {enabled ? (
        <p className="inline-success">
          Verificação em duas etapas ativa
          {account.data.mfa.enabledAt
            ? ` desde ${new Date(account.data.mfa.enabledAt).toLocaleString("pt-BR")}.`
            : "."}
        </p>
      ) : !setup ? (
        <>
          <p>
            Use um aplicativo autenticador para proteger sua conta com TOTP.
          </p>
          <button
            className="admin-button"
            onClick={() => begin.mutate()}
            disabled={begin.isPending}
          >
            Configurar
          </button>
        </>
      ) : (
        <>
          <Image
            unoptimized
            width={210}
            height={210}
            src={setup.qrCodeDataUrl}
            alt="QR Code para configurar TOTP"
          />
          <p>
            Leia o QR Code no aplicativo autenticador e informe o token de 6
            dígitos.
          </p>
          <input
            aria-label="Token de 6 dígitos"
            inputMode="numeric"
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
          />
          <button
            className="admin-button"
            disabled={token.length !== 6 || confirm.isPending}
            onClick={() => confirm.mutate()}
          >
            Confirmar
          </button>
        </>
      )}
      {(begin.isError || confirm.isError) && (
        <p className="inline-error">
          Não foi possível concluir a configuração.
        </p>
      )}
    </section>
  );
}

function CareerTable() {
  const query = useQuery({
    queryKey: ["career"],
    queryFn: () => api<Career[]>("/api/backend/me/career"),
  });
  return (
    <>
      <h2>
        <Building2 size={18} /> Histórico de vínculos · Alterações de acesso
        desde o cadastro
      </h2>
      <LoadingError loading={query.isLoading} error={query.isError} />
      <table className="admin-data-table career-table">
        <thead>
          <tr>
            <th>Unidade</th>
            <th>Data/hora</th>
            <th>Atual</th>
            <th>Principal</th>
            <th>Alterado por</th>
          </tr>
        </thead>
        <tbody>
          {query.data?.map((row) => (
            <tr key={row.id}>
              <td>
                Entrou em {row.sector.code} - {row.sector.name}
              </td>
              <td>{new Date(row.startedAt).toLocaleString("pt-BR")}</td>
              <td>{row.isCurrent ? "Sim" : ""}</td>
              <td>{row.isPrimary ? "Sim" : ""}</td>
              <td>{row.changedBy?.name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function ReportsPage() {
  const query = useQuery({
    queryKey: ["reports"],
    queryFn: () =>
      api<{ scope: string; sections: string[]; formulas: string }>(
        "/api/backend/reports",
      ),
  });
  return (
    <section className="reports-page">
      <h1>▦ Análises</h1>
      <div className="reports-layout">
        <nav className="reports-nav" aria-label="Seções de análises">
          {[
            "Visão geral",
            "Documentos",
            "Uso",
            "Volumes",
            "Distribuição",
            "Métricas",
            "Utilização",
            "Visualizações",
            "Atividade de acesso",
            "Registros técnicos",
          ].map((name) => (
            <button
              key={name}
              className={name === "Visão geral" ? "active" : undefined}
              aria-current={name === "Visão geral" ? "page" : undefined}
              disabled={name !== "Visão geral"}
            >
              {name}
            </button>
          ))}
        </nav>
        <div className="reports-content">
          <LoadingError loading={query.isLoading} error={query.isError} />
          <h2>
            Objetivo:{" "}
            <span>
              Analisar a evolução do Desempenho, da Conformidade e da
              Participação das pessoas usuárias.
            </span>
          </h2>
          <p>
            Escopo disponível:{" "}
            {query.data?.scope === "ORGANIZATION" ? "Organização" : "Unidade"}
          </p>
          <div className="reports-body">
            <fieldset>
              <legend>Comparar geral com:</legend>
              <label>
                <input type="radio" name="scope" defaultChecked /> Organização
                atual
              </label>
              <label>
                <input type="radio" name="scope" /> Unidade atual
              </label>
              <div className="fake-tree">
                ○ Organização
                <br />
                　└ ○ Unidade principal
                <br />
                　　 └ ○ Subunidades
              </div>
            </fieldset>
            <div className="indicator pending-purple">
              <strong>Desempenho</strong>
              <span>Indisponível nesta versão</span>
            </div>
            <div className="indicator pending-blue">
              <strong>Participação</strong>
              <span>Indisponível nesta versão</span>
            </div>
            <div className="indicator pending-green">
              <strong>Conformidade</strong>
              <span>Indisponível nesta versão</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
