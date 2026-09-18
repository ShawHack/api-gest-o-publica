import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrganizationStatus, Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import type { Request } from "express";
import { PROFILE_LEVEL } from "../access/access-policy";
import { PrismaService } from "../prisma.service";
import {
  normalizeSlug,
  OrganizationProvisioningError,
  OrganizationProvisioningService,
} from "../tenancy/organization-provisioning.service";
import { PlatformAuditService } from "./platform-audit.service";
import {
  CreatePlatformOrganizationDto,
  ListPlatformOrganizationsDto,
  UpdatePlatformOrganizationAdminDto,
  UpdatePlatformOrganizationDto,
} from "./platform-organizations.dto";

const organizationMetadataSelect = {
  id: true,
  name: true,
  displayName: true,
  slug: true,
  documentNumber: true,
  status: true,
  institutionalEmail: true,
  websiteUrl: true,
  phone: true,
  organizationType: true,
  documentFooterAddress: true,
  city: true,
  stateCode: true,
  countryCode: true,
  sizeCategory: true,
  printFont: true,
  active: true,
  startedAt: true,
  trialEndsAt: true,
  suspendedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const brandingSafeSelect = {
  productName: true,
  shortName: true,
  primaryColor: true,
  primaryHoverColor: true,
  linkColor: true,
  accentColor: true,
  loginTitle: true,
  loginSubtitle: true,
  supportEmail: true,
  supportUrl: true,
  helpUrl: true,
  legalFooter: true,
  emailSenderName: true,
  emailSenderAddress: true,
} as const;

@Injectable()
export class PlatformOrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: OrganizationProvisioningService,
    private readonly audit: PlatformAuditService,
  ) {}

  async list(query: ListPlatformOrganizationsDto) {
    const search = query.search?.trim();
    const where: Prisma.OrganizationWhereInput = {
      ...(query.status && query.status !== "ALL"
        ? { status: query.status }
        : {}),
      ...(query.organizationType
        ? { organizationType: query.organizationType }
        : {}),
      ...(query.city
        ? { city: { equals: query.city, mode: "insensitive" } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { displayName: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { documentNumber: { contains: search, mode: "insensitive" } },
              {
                domains: {
                  some: {
                    hostname: { contains: search, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.sortBy]: query.sortOrder },
        select: {
          id: true,
          name: true,
          displayName: true,
          slug: true,
          documentNumber: true,
          status: true,
          active: true,
          organizationType: true,
          city: true,
          stateCode: true,
          countryCode: true,
          createdAt: true,
          updatedAt: true,
          domains: {
            where: { primary: true, active: true },
            select: { hostname: true },
            take: 1,
          },
          _count: {
            select: {
              users: true,
              organizationModules: { where: { enabled: true } },
            },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);
    return {
      items: items.map(({ domains, _count, ...organization }) => ({
        ...organization,
        primaryDomain: domains[0]?.hostname ?? null,
        counts: {
          users: _count.users,
          enabledModules: _count.organizationModules,
        },
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async create(
    platformUserId: string,
    dto: CreatePlatformOrganizationDto,
    request?: Request,
  ) {
    try {
      const result = await this.provisioning.provision(
        {
          organization: {
            ...dto.organization,
            trialEndsAt: dto.organization.trialEndsAt
              ? new Date(dto.organization.trialEndsAt)
              : undefined,
          },
          domain: { hostname: dto.domain.hostname },
          branding: dto.branding,
          initialAdmin: dto.initialAdmin,
        },
        {
          mode: "strict",
          inTransaction: async (tx, provisioned) => {
            await this.audit.record(
              {
                platformUserId,
                organizationId: provisioned.organizationId,
                action: "ORGANIZATION_CREATED",
                entityType: "ORGANIZATION",
                entityId: provisioned.organizationId,
                metadata: { primaryHostname: provisioned.hostname },
              },
              request,
              tx,
            );
          },
        },
      );
      return this.get(result.organizationId);
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async get(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      select: {
        ...organizationMetadataSelect,
        domains: {
          select: {
            id: true,
            hostname: true,
            primary: true,
            verifiedAt: true,
            active: true,
            createdAt: true,
          },
          orderBy: [{ primary: "desc" }, { createdAt: "asc" }],
        },
        branding: { select: brandingSafeSelect },
        users: {
          where: { profileLevel: PROFILE_LEVEL.administrator },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            id: true,
            name: true,
            active: true,
            createdAt: true,
            identity: { select: { email: true } },
          },
        },
        _count: {
          select: {
            users: true,
            sectors: true,
            organizationModules: { where: { enabled: true } },
          },
        },
      },
    });
    if (!organization) {
      throw new NotFoundException("Organização não encontrada");
    }
    const { users, _count, ...safe } = organization;
    const admin = users[0];
    return {
      ...safe,
      initialAdmin: admin
        ? {
            id: admin.id,
            name: admin.name,
            email: admin.identity.email,
            active: admin.active,
            createdAt: admin.createdAt,
          }
        : null,
      counts: {
        users: _count.users,
        sectors: _count.sectors,
        enabledModules: _count.organizationModules,
      },
    };
  }

  async update(
    id: string,
    platformUserId: string,
    dto: UpdatePlatformOrganizationDto,
    request?: Request,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("Informe ao menos um campo para atualização");
    }
    const data = {
      ...dto,
      ...(dto.slug ? { slug: normalizeSlug(dto.slug) } : {}),
      ...(dto.stateCode ? { stateCode: dto.stateCode.toUpperCase() } : {}),
      ...(dto.countryCode
        ? { countryCode: dto.countryCode.toUpperCase() }
        : {}),
      ...(dto.trialEndsAt
        ? { trialEndsAt: new Date(dto.trialEndsAt) }
        : {}),
    };
    try {
      await this.prisma.$transaction(async (tx) => {
        const before = await tx.organization.findUnique({
          where: { id },
          select: organizationMetadataSelect,
        });
        if (!before) throw new NotFoundException("Organização não encontrada");
        const after = await tx.organization.update({
          where: { id },
          data,
          select: organizationMetadataSelect,
        });
        await this.audit.record(
          {
            platformUserId,
            organizationId: id,
            action: "ORGANIZATION_UPDATED",
            entityType: "ORGANIZATION",
            entityId: id,
            metadata: {
              changes: Object.fromEntries(
                Object.keys(dto).map((key) => [
                  key,
                  {
                    from: this.jsonValue(before[key as keyof typeof before]),
                    to: this.jsonValue(after[key as keyof typeof after]),
                  },
                ]),
              ),
            },
          },
          request,
          tx,
        );
      });
      return this.get(id);
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async updateInitialAdmin(
    id: string,
    platformUserId: string,
    dto: UpdatePlatformOrganizationAdminDto,
    request?: Request,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("Informe ao menos um campo para atualização");
    }
    const passwordHash = dto.password ? await argon2.hash(dto.password) : undefined;

    await this.prisma.$transaction(async (tx) => {
      const admin = await tx.user.findFirst({
        where: {
          organizationId: id,
          profileLevel: PROFILE_LEVEL.administrator,
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          identityId: true,
          name: true,
          active: true,
          identity: { select: { email: true } },
        },
      });
      if (!admin) {
        throw new NotFoundException("Administrador inicial não localizado");
      }

      const email = dto.email?.trim();
      const emailNormalized = email?.toLowerCase();
      let identityId = admin.identityId;

      if (emailNormalized && emailNormalized !== admin.identity.email.toLowerCase()) {
        const existingIdentity = await tx.identity.findUnique({
          where: { emailNormalized },
          select: { id: true },
        });
        if (existingIdentity) {
          const duplicateMembership = await tx.user.findFirst({
            where: { organizationId: id, identityId: existingIdentity.id },
            select: { id: true },
          });
          if (duplicateMembership && duplicateMembership.id !== admin.id) {
            throw new ConflictException(
              "Já existe uma pessoa usuária com este e-mail na organização",
            );
          }
          identityId = existingIdentity.id;
        } else {
          const currentIdentity = await tx.identity.findUniqueOrThrow({
            where: { id: admin.identityId },
            select: { passwordHash: true },
          });
          const createdIdentity = await tx.identity.create({
            data: {
              email: email!,
              emailNormalized,
              passwordHash: passwordHash ?? currentIdentity.passwordHash,
              active: true,
            },
            select: { id: true },
          });
          identityId = createdIdentity.id;
        }
      }

      await tx.user.update({
        where: { id: admin.id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          ...(identityId !== admin.identityId ? { identityId } : {}),
        },
      });

      const central = await tx.sector.upsert({
        where: { organizationId_code: { organizationId: id, code: "CENTRAL" } },
        update: { name: "Central", active: true },
        create: { organizationId: id, code: "CENTRAL", name: "Central" },
      });
      await tx.userSector.upsert({
        where: { userId_sectorId: { userId: admin.id, sectorId: central.id } },
        update: { active: true, isPrimary: true, isManager: true },
        create: {
          organizationId: id,
          userId: admin.id,
          sectorId: central.id,
          active: true,
          isPrimary: true,
          isManager: true,
        },
      });
      const currentMembership = await tx.userSectorMembership.findFirst({
        where: {
          organizationId: id,
          userId: admin.id,
          sectorId: central.id,
          isCurrent: true,
        },
        select: { id: true },
      });
      if (!currentMembership) {
        await tx.userSectorMembership.create({
          data: {
            organizationId: id,
            userId: admin.id,
            sectorId: central.id,
            isCurrent: true,
            isPrimary: true,
          },
        });
      }

      const identityData = {
        ...(passwordHash ? { passwordHash } : {}),
      };
      if (Object.keys(identityData).length > 0) {
        await tx.identity.update({ where: { id: identityId }, data: identityData });
      }
      if (dto.password) {
        await tx.refreshToken.updateMany({
          where: { identityId, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: "PLATFORM_PASSWORD_RESET" },
        });
      }

      await this.audit.record(
        {
          platformUserId,
          organizationId: id,
          action: "ORGANIZATION_INITIAL_ADMIN_UPDATED",
          entityType: "USER",
          entityId: admin.id,
          metadata: {
            changes: {
              ...(dto.name !== undefined
                ? { name: { from: admin.name, to: dto.name.trim() } }
                : {}),
              ...(email !== undefined
                ? { email: { from: admin.identity.email, to: email } }
                : {}),
              ...(dto.active !== undefined
                ? { active: { from: admin.active, to: dto.active } }
                : {}),
              ...(dto.password ? { passwordReset: true } : {}),
            },
          },
        },
        request,
        tx,
      );
    });

    return this.get(id);
  }

  suspend(
    id: string,
    platformUserId: string,
    reason: string,
    request?: Request,
  ) {
    return this.transition(
      id,
      platformUserId,
      OrganizationStatus.ACTIVE,
      OrganizationStatus.SUSPENDED,
      reason,
      request,
    );
  }

  reactivate(
    id: string,
    platformUserId: string,
    reason: string,
    request?: Request,
  ) {
    return this.transition(
      id,
      platformUserId,
      OrganizationStatus.SUSPENDED,
      OrganizationStatus.ACTIVE,
      reason,
      request,
    );
  }

  private async transition(
    id: string,
    platformUserId: string,
    from: OrganizationStatus,
    to: OrganizationStatus,
    reason: string,
    request?: Request,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const changed = await tx.organization.updateMany({
        where: { id, status: from },
        data: {
          status: to,
          active: to === OrganizationStatus.ACTIVE,
          suspendedAt: to === OrganizationStatus.SUSPENDED ? now : null,
        },
      });
      if (changed.count === 0) {
        const exists = await tx.organization.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!exists) throw new NotFoundException("Organização não encontrada");
        throw new ConflictException(
          `Transição inválida de ${exists.status} para ${to}`,
        );
      }
      if (to === OrganizationStatus.SUSPENDED) {
        await tx.refreshToken.updateMany({
          where: { organizationId: id, revokedAt: null },
          data: { revokedAt: now, revokedReason: "ORGANIZATION_SUSPENDED" },
        });
      }
      await this.audit.record(
        {
          platformUserId,
          organizationId: id,
          action:
            to === OrganizationStatus.SUSPENDED
              ? "ORGANIZATION_SUSPENDED"
              : "ORGANIZATION_REACTIVATED",
          entityType: "ORGANIZATION",
          entityId: id,
          metadata: { reason, from, to },
        },
        request,
        tx,
      );
    });
    return this.get(id);
  }

  private jsonValue(value: unknown): Prisma.JsonValue {
    if (value === null) return null;
    if (typeof value === "string" || typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") return value;
    if (value instanceof Date) return value.toISOString();
    throw new TypeError("Valor de auditoria não serializável");
  }

  private rethrowConflict(error: unknown): never {
    if (
      error instanceof OrganizationProvisioningError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002")
    ) {
      throw new ConflictException(
        error instanceof Error ? error.message : "Registro duplicado",
      );
    }
    throw error;
  }
}
