import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlatformOrganizationDetail } from "./platform-organization-detail";

const apiMock = vi.fn();
const permissions = [
  "organization.read",
  "organization.update",
  "organization.suspend",
];

vi.mock("@/lib/api", () => ({
  api: (...args: unknown[]) => apiMock(...args),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
}));
vi.mock("@/hooks/use-platform-user", () => ({
  usePlatformUser: () => ({ data: { permissions }, isLoading: false }),
}));

const organization = {
  id: "org-1",
  name: "Município Exemplo",
  displayName: "Prefeitura Exemplo",
  slug: "prefeitura-exemplo",
  documentNumber: null,
  institutionalEmail: "contato@exemplo.gov.br",
  websiteUrl: null,
  phone: null,
  organizationType: "Outro",
  documentFooterAddress: null,
  city: "Exemplo",
  stateCode: "SP",
  countryCode: "BR",
  sizeCategory: null,
  printFont: null,
  status: "ACTIVE",
  active: true,
  startedAt: null,
  trialEndsAt: null,
  suspendedAt: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-16T10:00:00.000Z",
  domains: [
    {
      id: "domain-1",
      hostname: "docs.exemplo.gov.br",
      primary: true,
      verifiedAt: "2026-08-01T10:00:00.000Z",
      active: true,
      createdAt: "2026-08-01T10:00:00.000Z",
    },
  ],
  branding: null,
  initialAdmin: {
    id: "user-1",
    name: "Admin Exemplo",
    email: "admin@exemplo.gov.br",
    active: true,
    createdAt: "2026-08-01T10:00:00.000Z",
  },
  counts: { users: 9, sectors: 4, enabledModules: 2 },
};

function renderDetail() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlatformOrganizationDetail id="org-1" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  permissions.splice(0, permissions.length, "organization.read", "organization.update", "organization.suspend");
});

describe("PlatformOrganizationDetail", () => {
  it("edita campos seguros e suspende com motivo", async () => {
    apiMock.mockResolvedValue(organization);
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Prefeitura Exemplo" })).toBeInTheDocument();
    expect(screen.getByText("docs.exemplo.gov.br")).toBeInTheDocument();
    expect(screen.getByText("admin@exemplo.gov.br")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editar dados" }));
    fireEvent.change(screen.getByLabelText("Nome de exibição"), {
      target: { value: "Prefeitura Atualizada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith(
        "/api/platform/organizations/org-1",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    const patchCall = apiMock.mock.calls.find(
      ([path, request]) =>
        path === "/api/platform/organizations/org-1" && request?.method === "PATCH",
    );
    const payload = JSON.parse(patchCall?.[1].body);
    expect(payload.displayName).toBe("Prefeitura Atualizada");
    expect(payload.status).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Suspender" }));
    fireEvent.change(screen.getByLabelText("Motivo"), {
      target: { value: "Bloqueio solicitado" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Suspender",
      }),
    );
    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith(
        "/api/platform/organizations/org-1/suspend",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ reason: "Bloqueio solicitado" }),
        }),
      ),
    );
  });

  it("oculta edição e transição sem permissões", async () => {
    permissions.splice(0, permissions.length, "organization.read");
    apiMock.mockResolvedValue(organization);
    renderDetail();
    expect(await screen.findByText("Ativa")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar dados" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suspender" })).not.toBeInTheDocument();
  });
});
