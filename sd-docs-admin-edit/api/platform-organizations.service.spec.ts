import { ConflictException, NotFoundException } from "@nestjs/common";
import { OrganizationStatus } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { OrganizationProvisioningService } from "../tenancy/organization-provisioning.service";
import { PlatformAuditService } from "./platform-audit.service";
import { PlatformOrganizationsService } from "./platform-organizations.service";

describe("PlatformOrganizationsService", () => {
  const tx = {
    organization: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    refreshToken: { updateMany: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
  };
  const provisioning = { provision: jest.fn() };
  const audit = { record: jest.fn() };
  let service: PlatformOrganizationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    service = new PlatformOrganizationsService(
      prisma as unknown as PrismaService,
      provisioning as unknown as OrganizationProvisioningService,
      audit as unknown as PlatformAuditService,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "org-id" } as never);
  });

  it("suspende isolando tokens pela organização e audita na transação", async () => {
    tx.organization.updateMany.mockResolvedValue({ count: 1 });
    tx.refreshToken.updateMany.mockResolvedValue({ count: 2 });
    audit.record.mockResolvedValue({});

    await expect(
      service.suspend("org-id", "platform-user", "Inadimplência"),
    ).resolves.toEqual({ id: "org-id" });

    expect(tx.organization.updateMany).toHaveBeenCalledWith({
      where: { id: "org-id", status: OrganizationStatus.ACTIVE },
      data: expect.objectContaining({
        status: OrganizationStatus.SUSPENDED,
        active: false,
      }),
    });
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { organizationId: "org-id", revokedAt: null },
      data: expect.objectContaining({
        revokedReason: "ORGANIZATION_SUSPENDED",
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-id",
        action: "ORGANIZATION_SUSPENDED",
      }),
      undefined,
      tx,
    );
  });

  it("não revoga tokens quando a transição é inválida", async () => {
    tx.organization.updateMany.mockResolvedValue({ count: 0 });
    tx.organization.findUnique.mockResolvedValue({
      status: OrganizationStatus.DRAFT,
    });

    await expect(
      service.suspend("org-id", "platform-user", "Motivo"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it("retorna 404 quando a organização não existe", async () => {
    tx.organization.updateMany.mockResolvedValue({ count: 0 });
    tx.organization.findUnique.mockResolvedValue(null);
    await expect(
      service.reactivate("missing", "platform-user", "Motivo"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("cria com auditoria no callback transacional e sem senha nos metadados", async () => {
    provisioning.provision.mockImplementation(
      async (
        _input: unknown,
        options: {
          inTransaction: (
            client: typeof tx,
            result: {
              organizationId: string;
              hostname: string;
              adminEmail: string;
            },
          ) => Promise<void>;
        },
      ) => {
        await options.inTransaction(tx, {
          organizationId: "org-id",
          hostname: "org.test",
          adminEmail: "admin@org.test",
        });
        return {
          organizationId: "org-id",
          hostname: "org.test",
          adminEmail: "admin@org.test",
        };
      },
    );
    audit.record.mockResolvedValue({});

    await service.create("platform-user", {
      organization: {
        name: "Órgão",
        displayName: "Órgão",
        slug: "orgao",
      },
      domain: { hostname: "org.test" },
      branding: { shortName: "Órgão" },
      initialAdmin: {
        name: "Admin",
        email: "admin@org.test",
        password: "Secret123",
      },
    });
    const auditEntry = audit.record.mock.calls[0][0];
    expect(auditEntry.metadata).toEqual({ primaryHostname: "org.test" });
    expect(JSON.stringify(auditEntry)).not.toContain("Secret123");
    expect(audit.record.mock.calls[0][2]).toBe(tx);
  });
});
