import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import QRCode from "qrcode";
import type { Prisma } from "@prisma/client";
import { PERMISSIONS } from "../access/access-policy";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma.service";
import { PushService } from "../push/push.service";
import { StorageService } from "../storage/storage.service";
import {
  CreateServiceCharterDto,
  CreateSignerListDto,
  CreateTemplateDto,
  GenerateCounterPasswordDto,
  TemplateScope,
  PersonQueryDto,
  ServiceCharterFormFieldDto,
  UpdateAccountDto,
  UpdateServiceCharterDto,
} from "./structure.dto";
import { decryptSecret, encryptSecret } from "./secret-crypto";
import { generateTotpSecret, generateTotpUri, verifyTotp } from "./totp";

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

@Injectable()
export class StructureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly push: PushService,
  ) {}

  async listTemplates(
    actor: AuthenticatedUser,
    scope: TemplateScope,
    sectorId?: string,
  ) {
    this.assertTemplateScope(actor, scope, sectorId);
    if (sectorId) await this.requireActiveUserSector(actor, sectorId);
    return this.prisma.responseTemplate.findMany({
      where: {
        organizationId: actor.organizationId,
        scope,
        sectorId: sectorId ?? null,
        active: true,
        ...(scope === "USER" ? { createdByUserId: actor.id } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  async createTemplate(actor: AuthenticatedUser, dto: CreateTemplateDto) {
    this.assertTemplateScope(actor, dto.scope, dto.sectorId);
    if (dto.sectorId) await this.requireActiveUserSector(actor, dto.sectorId);
    return this.prisma.$transaction(async (tx) => {
      const entity = await tx.responseTemplate.create({
        data: {
          organizationId: actor.organizationId,
          sectorId: dto.scope === "SECTOR" ? dto.sectorId : null,
          scope: dto.scope,
          name: dto.name.trim(),
          content: dto.content,
          createdByUserId: actor.id,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          organizationId: actor.organizationId,
          action: "created",
          entityType: "response_template",
          entityId: entity.id,
        },
      });
      return entity;
    });
  }

  async listSignerLists(
    actor: AuthenticatedUser,
    contextKey: string,
    sectorId?: string,
  ) {
    const context = await this.prisma.taxonomyContext.findFirst({
      where: { key: contextKey, active: true },
    });
    if (!context) throw new NotFoundException("Contexto não encontrado");
    if (sectorId) await this.requireActiveUserSector(actor, sectorId);
    return this.prisma.signerList.findMany({
      where: {
        organizationId: actor.organizationId,
        taxonomyContextId: context.id,
        status: "ACTIVE",
        ...(sectorId ? { sectorId } : {}),
      },
      include: {
        items: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                identity: { select: { email: true } },
              },
            },
            person: {
              select: { id: true, type: true, name: true, email: true },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async createSignerList(actor: AuthenticatedUser, dto: CreateSignerListDto) {
    const context = await this.prisma.taxonomyContext.findFirst({
      where: { key: dto.context, active: true },
    });
    if (!context) throw new NotFoundException("Contexto não encontrado");

    const scope = dto.scope ?? "ORGANIZATION";
    const sectorId = scope === "SECTOR" ? dto.sectorId : null;
    if (scope === "SECTOR") {
      if (!sectorId) {
        throw new BadRequestException(
          "Informe a unidade para grupos do tipo unidade",
        );
      }
      await this.requireActiveUserSector(actor, sectorId);
    }

    const userIds = [...new Set((dto.userIds ?? []).filter(Boolean))];
    if (userIds.length) {
      const validUsers = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
          organizationId: actor.organizationId,
          active: true,
        },
        select: { id: true },
      });
      if (validUsers.length !== userIds.length) {
        throw new BadRequestException("Há assinantes inválidos no grupo");
      }
    }

    return this.prisma.signerList.create({
      data: {
        organizationId: actor.organizationId,
        sectorId,
        taxonomyContextId: context.id,
        scope,
        name: dto.name.trim(),
        status: "ACTIVE",
        createdByUserId: actor.id,
        items: userIds.length
          ? {
              create: userIds.map((userId, index) => ({
                organizationId: actor.organizationId,
                userId,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        items: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                identity: { select: { email: true } },
              },
            },
            person: {
              select: { id: true, type: true, name: true, email: true },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  listSendLists(organizationId: string, status: "ACTIVE" | "INACTIVE") {
    return this.prisma.sendList.findMany({
      where: { organizationId, status },
      orderBy: { name: "asc" },
    });
  }

  listServiceCharters(
    organizationId: string,
    status: "ACTIVE" | "INACTIVE" = "ACTIVE",
  ) {
    return this.prisma.serviceCharter.findMany({
      where: { organizationId, status },
      include: {
        sector: true,
        taxonomyContext: true,
        subjects: { include: { subject: true } },
        fileNames: {
          include: { fileName: true },
          orderBy: { sortOrder: "asc" },
        },
        form: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  listAttachmentFileNames(organizationId: string) {
    return this.prisma.attachmentFileName.findMany({
      where: { organizationId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async serviceCharterTree(
    organizationId: string,
    status: "ACTIVE" | "INACTIVE" = "ACTIVE",
  ) {
    const rows = await this.listServiceCharters(organizationId, status);
    const nodes = new Map(
      rows.map((row) => [row.id, { ...row, children: [] as unknown[] }]),
    );
    const roots: Array<(typeof rows)[number] & { children: unknown[] }> = [];
    for (const row of rows) {
      const node = nodes.get(row.id)!;
      const parent = row.parentId ? nodes.get(row.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  /**
   * Remove serviço não utilizado; se já houver solicitação/processo ou filhos,
   * apenas inativa (status INACTIVE).
   */
  async removeServiceCharter(actor: AuthenticatedUser, id: string) {
    const current = await this.prisma.serviceCharter.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!current) {
      throw new NotFoundException("Carta de Serviço não encontrada");
    }

    const [usageCount, childCount] = await Promise.all([
      this.prisma.externalRequest.count({
        where: { serviceCharterId: id, organizationId: actor.organizationId },
      }),
      this.prisma.serviceCharter.count({
        where: {
          parentId: id,
          organizationId: actor.organizationId,
          status: { not: "DELETED" },
        },
      }),
    ]);

    if (usageCount > 0 || childCount > 0) {
      if (current.status === "INACTIVE") {
        return {
          id,
          action: "already_inactive" as const,
          usageCount,
          childCount,
          message:
            usageCount > 0
              ? "Serviço já está inativo e possui processos vinculados."
              : "Serviço já está inativo e possui serviços filhos.",
        };
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.serviceCharter.update({
          where: { id },
          data: { status: "INACTIVE", online: false },
        });
        await tx.auditLog.create({
          data: {
            userId: actor.id,
            organizationId: actor.organizationId,
            action: "inactivated",
            entityType: "service_charter",
            entityId: id,
          },
        });
      });
      return {
        id,
        action: "inactivated" as const,
        usageCount,
        childCount,
        message:
          usageCount > 0
            ? "Serviço inativado porque já possui processo(s) vinculado(s)."
            : "Serviço inativado porque possui serviços filhos na hierarquia.",
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceCharter.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          organizationId: actor.organizationId,
          action: "deleted",
          entityType: "service_charter",
          entityId: id,
        },
      });
    });
    return {
      id,
      action: "deleted" as const,
      usageCount: 0,
      childCount: 0,
      message: "Serviço excluído permanentemente.",
    };
  }

  private formatDuplicateCharterMessage(duplicate: {
    name: string;
    status: string;
    sector?: { name: string; code?: string } | null;
    taxonomyContext?: { name: string } | null;
    subjects?: Array<{ subject?: { name: string } | null }>;
    parent?: { name: string } | null;
  }) {
    const details: string[] = [];
    if (duplicate.taxonomyContext?.name) {
      details.push(`Categoria: "${duplicate.taxonomyContext.name}"`);
    } else if (duplicate.subjects?.length) {
      const subNames = duplicate.subjects
        .map((s) => s.subject?.name)
        .filter(Boolean);
      if (subNames.length) details.push(`Categoria: "${subNames.join(", ")}"`);
    }
    if (duplicate.sector?.name) {
      details.push(`Setor: "${duplicate.sector.name}"`);
    }
    if (duplicate.parent?.name) {
      details.push(`Pasta/Serviço Pai: "${duplicate.parent.name}"`);
    }
    const statusLabel =
      duplicate.status === "ACTIVE"
        ? "Ativo"
        : duplicate.status === "INACTIVE"
          ? "Inativo"
          : duplicate.status;
    details.push(`Status: ${statusLabel}`);

    return `Já existe um serviço cadastrado com este nome nesta categoria (${details.join(" | ")}).`;
  }

  async createServiceCharter(
    actor: AuthenticatedUser,
    dto: CreateServiceCharterDto,
  ) {
    const trimmedName = dto.name?.trim();
    if (!trimmedName) throw new BadRequestException("Informe o nome do serviço");
    const duplicate = await this.prisma.serviceCharter.findFirst({
      where: {
        organizationId: actor.organizationId,
        ...(dto.taxonomyContextId ? { taxonomyContextId: dto.taxonomyContextId } : {}),
        name: { equals: trimmedName, mode: "insensitive" },
        status: { not: "DELETED" },
      },
      include: {
        sector: { select: { name: true, code: true } },
        taxonomyContext: { select: { name: true } },
        subjects: { include: { subject: { select: { name: true } } } },
        parent: { select: { name: true } },
      },
    });
    if (duplicate) {
      throw new ConflictException(this.formatDuplicateCharterMessage(duplicate));
    }
    await this.validateServiceCharterSector(actor.organizationId, dto.sectorId);
    await this.validateServiceCharterContext(dto.taxonomyContextId);
    if (dto.parentId) {
      const parent = await this.prisma.serviceCharter.findFirst({
        where: { id: dto.parentId, organizationId: actor.organizationId },
      });
      if (!parent)
        throw new BadRequestException("Carta de Serviço pai inválida");
    }
    const subjectCount = await this.prisma.subject.count({
      where: {
        id: { in: dto.subjectIds },
        organizationId: actor.organizationId,
        active: true,
      },
    });
    if (subjectCount !== dto.subjectIds.length) {
      throw new BadRequestException("Categoria inválida");
    }
    const fileNameIds = dto.attachmentFileNameIds ?? [];
    const requiredFileNameIds = dto.requiredAttachmentFileNameIds ?? [];
    await this.validateServiceCharterFileNames(
      actor.organizationId,
      fileNameIds,
    );
    this.validateRequiredFileNames(fileNameIds, requiredFileNameIds);
    const requiredFileNames = new Set(requiredFileNameIds);
    const formFields = this.normalizeServiceFormFields(dto.formFields ?? []);
    return this.prisma.$transaction(async (tx) => {
      const entity = await tx.serviceCharter.create({
        data: {
          organizationId: actor.organizationId,
          name: dto.name,
          sectorId: dto.sectorId,
          taxonomyContextId: dto.taxonomyContextId,
          parentId: dto.parentId,
          icon: dto.icon,
          description: dto.description,
          online: dto.online,
          featuredTerm: dto.featuredTerm,
          officialContent: dto.officialContent as
            | Prisma.InputJsonObject
            | undefined,
          status: dto.status,
          subjects: {
            create: dto.subjectIds.map((subjectId) => ({ subjectId })),
          },
          fileNames: {
            create: fileNameIds.map((attachmentFileNameId, index) => ({
              attachmentFileNameId,
              required: requiredFileNames.has(attachmentFileNameId),
              sortOrder: index,
            })),
          },
          ...(formFields.length
            ? {
                form: {
                  create: {
                    organization: {
                      connect: { id: actor.organizationId },
                    },
                    fieldsJson: formFields,
                  },
                },
              }
            : {}),
        },
        include: {
          sector: true,
          taxonomyContext: true,
          subjects: { include: { subject: true } },
          fileNames: { include: { fileName: true } },
          form: true,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          organizationId: actor.organizationId,
          action: "created",
          entityType: "service_charter",
          entityId: entity.id,
        },
      });
      return entity;
    });
  }

  async updateServiceCharter(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateServiceCharterDto,
  ) {
    const current = await this.prisma.serviceCharter.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!current)
      throw new NotFoundException("Carta de Serviço não encontrada");
    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) throw new BadRequestException("Informe o nome do serviço");
      const targetContextId =
        dto.taxonomyContextId !== undefined
          ? dto.taxonomyContextId
          : current.taxonomyContextId;
      const duplicate = await this.prisma.serviceCharter.findFirst({
        where: {
          id: { not: id },
          organizationId: actor.organizationId,
          ...(targetContextId ? { taxonomyContextId: targetContextId } : {}),
          name: { equals: trimmedName, mode: "insensitive" },
          status: { not: "DELETED" },
        },
        include: {
          sector: { select: { name: true, code: true } },
          taxonomyContext: { select: { name: true } },
          subjects: { include: { subject: { select: { name: true } } } },
          parent: { select: { name: true } },
        },
      });
      if (duplicate) {
        throw new ConflictException(this.formatDuplicateCharterMessage(duplicate));
      }
    }
    if (dto.sectorId) {
      await this.validateServiceCharterSector(
        actor.organizationId,
        dto.sectorId,
      );
    }
    if (dto.taxonomyContextId) {
      await this.validateServiceCharterContext(dto.taxonomyContextId);
    }
    if (dto.parentId) {
      let cursor: string | null = dto.parentId;
      while (cursor) {
        if (cursor === id) {
          throw new BadRequestException("Hierarquia não pode conter ciclo");
        }
        const parent: { parentId: string | null } | null =
          await this.prisma.serviceCharter.findFirst({
            where: { id: cursor, organizationId: actor.organizationId },
            select: { parentId: true },
          });
        if (!parent) throw new BadRequestException("Carta pai inválida");
        cursor = parent.parentId;
      }
    }
    if (dto.subjectIds) {
      const count = await this.prisma.subject.count({
        where: {
          id: { in: dto.subjectIds },
          organizationId: actor.organizationId,
          active: true,
        },
      });
      if (count !== dto.subjectIds.length) {
        throw new BadRequestException("Categoria inválida");
      }
    }
    if (dto.requiredAttachmentFileNameIds && !dto.attachmentFileNameIds) {
      throw new BadRequestException(
        "Informe os nomes de arquivo ao alterar a obrigatoriedade",
      );
    }
    if (dto.attachmentFileNameIds) {
      await this.validateServiceCharterFileNames(
        actor.organizationId,
        dto.attachmentFileNameIds,
      );
      this.validateRequiredFileNames(
        dto.attachmentFileNameIds,
        dto.requiredAttachmentFileNameIds ?? [],
      );
    }
    const {
      subjectIds,
      attachmentFileNameIds,
      requiredAttachmentFileNameIds,
      formFields,
      officialContent,
      ...data
    } = dto;
    const requiredFileNames = new Set(requiredAttachmentFileNameIds ?? []);
    const normalizedFormFields =
      formFields === undefined
        ? undefined
        : this.normalizeServiceFormFields(formFields);
    return this.prisma.$transaction(async (tx) => {
      if (subjectIds) {
        await tx.serviceCharterSubject.deleteMany({
          where: { serviceCharterId: id },
        });
      }
      if (attachmentFileNameIds) {
        await tx.serviceCharterFileName.deleteMany({
          where: { serviceCharterId: id },
        });
      }
      if (normalizedFormFields) {
        if (normalizedFormFields.length) {
          await tx.serviceCharterForm.upsert({
            where: { serviceCharterId: id },
            create: {
              organizationId: actor.organizationId,
              serviceCharterId: id,
              fieldsJson: normalizedFormFields,
            },
            update: { fieldsJson: normalizedFormFields },
          });
        } else {
          await tx.serviceCharterForm.deleteMany({
            where: { serviceCharterId: id },
          });
        }
      }
      const entity = await tx.serviceCharter.update({
        where: { id },
        data: {
          ...data,
          ...(officialContent === undefined
            ? {}
            : { officialContent: officialContent as Prisma.InputJsonObject }),
          ...(subjectIds
            ? {
                subjects: {
                  create: subjectIds.map((subjectId) => ({ subjectId })),
                },
              }
            : {}),
          ...(attachmentFileNameIds
            ? {
                fileNames: {
                  create: attachmentFileNameIds.map(
                    (attachmentFileNameId, index) => ({
                      attachmentFileNameId,
                      required: requiredFileNames.has(attachmentFileNameId),
                      sortOrder: index,
                    }),
                  ),
                },
              }
            : {}),
        },
        include: {
          sector: true,
          taxonomyContext: true,
          subjects: { include: { subject: true } },
          fileNames: { include: { fileName: true } },
          form: true,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          organizationId: actor.organizationId,
          action: "updated",
          entityType: "service_charter",
          entityId: id,
        },
      });
      return entity;
    });
  }

  async uploadServiceCharterIcon(
    actor: AuthenticatedUser,
    id: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ) {
    const charter = await this.prisma.serviceCharter.findFirst({
      where: { id, organizationId: actor.organizationId },
      select: { id: true },
    });
    if (!charter) throw new NotFoundException("Serviço não encontrado");
    if (file.size > 2 * 1024 * 1024)
      throw new BadRequestException("O ícone deve ter no máximo 2 MB");
    const extension = this.validAvatarExtension(file.mimetype, file.buffer);
    const key = `tenants/${actor.organizationId}/service-charters/${id}/icon.${extension}`;
    await this.storage.put(key, file.buffer);
    await this.prisma.serviceCharter.update({
      where: { id },
      data: { iconStorageKey: key },
    });
    return { iconUrl: `/api/backend/structure/service-charters/${id}/icon` };
  }

  async openServiceCharterIcon(actor: AuthenticatedUser, id: string) {
    const charter = await this.prisma.serviceCharter.findFirst({
      where: { id, organizationId: actor.organizationId },
      select: { iconStorageKey: true },
    });
    if (!charter?.iconStorageKey)
      throw new NotFoundException("Ícone não encontrado");
    const extension = charter.iconStorageKey.split(".").pop() ?? "";
    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      webp: "image/webp",
    };
    const asset = await this.storage.open(charter.iconStorageKey);
    return { ...asset, mimeType: mimeTypes[extension] ?? "image/png" };
  }

  private async validateServiceCharterSector(
    organizationId: string,
    sectorId: string,
  ) {
    const sector = await this.prisma.sector.findFirst({
      where: { id: sectorId, organizationId, active: true },
      select: { id: true },
    });
    if (!sector) throw new BadRequestException("Unidade responsável inválida");
  }

  private async validateServiceCharterFileNames(
    organizationId: string,
    fileNameIds: string[],
  ) {
    if (!fileNameIds.length) return;
    const count = await this.prisma.attachmentFileName.count({
      where: { id: { in: fileNameIds }, organizationId, active: true },
    });
    if (count !== fileNameIds.length) {
      throw new BadRequestException("Nome do arquivo inválido");
    }
  }

  private validateRequiredFileNames(
    fileNameIds: string[],
    requiredFileNameIds: string[],
  ) {
    const selected = new Set(fileNameIds);
    if (requiredFileNameIds.some((id) => !selected.has(id))) {
      throw new BadRequestException(
        "Um documento obrigatório deve estar selecionado no serviço",
      );
    }
  }

  private normalizeServiceFormFields(fields: ServiceCharterFormFieldDto[]) {
    if (fields.length > 100) {
      throw new BadRequestException("Limite de 100 campos por formulário");
    }
    const ids = new Set(fields.map((field) => field.id));
    if (ids.size !== fields.length) {
      throw new BadRequestException("Há campos duplicados no formulário");
    }
    if (fields.some((field) => !field.label.trim())) {
      throw new BadRequestException("Todo campo do formulário precisa de nome");
    }
    return fields.map((field, index) => ({
      id: field.id,
      label: field.label.trim(),
      type: field.type,
      ...(field.placeholder?.trim()
        ? { placeholder: field.placeholder.trim() }
        : {}),
      required: field.required,
      sortOrder: index,
    }));
  }

  private async validateServiceCharterContext(taxonomyContextId: string) {
    const context = await this.prisma.taxonomyContext.findFirst({
      where: { id: taxonomyContextId, active: true },
      select: { id: true },
    });
    if (!context) throw new BadRequestException("Categoria oficial inválida");
  }

  listDocumentRoles(organizationId: string) {
    return this.prisma.documentRole.findMany({
      where: { organizationId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  }

  listPersons(organizationId: string, query: PersonQueryDto) {
    return this.prisma.person.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        type: query.type,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: "insensitive" } },
                { cpfCnpj: { contains: query.search } },
                { email: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(query.listId
          ? { memberships: { some: { personListId: query.listId } } }
          : {}),
      },
      include: { memberships: { include: { personList: true } } },
      orderBy: { name: "asc" },
      take: 100,
    });
  }

  listPersonLists(organizationId: string) {
    return this.prisma.personList.findMany({
      where: { organizationId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  }

  signatureQueue(
    userId: string,
    organizationId: string,
    status?: "PENDING" | "SIGNED" | "REJECTED",
  ) {
    return this.prisma.signatureRequest.findMany({
      where: { requestedToUserId: userId, organizationId, status },
      include: {
        document: {
          select: {
            id: true,
            number: true,
            year: true,
            subject: true,
            body: true,
          },
        },
        requestedBy: { select: { id: true, name: true } },
        attachment: { select: { id: true, originalName: true, mimeType: true } },
      },
      orderBy: { requestedAt: "desc" },
    });
  }

  async sign(
    actor: AuthenticatedUser,
    id: string,
    token: string,
    context: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    const pending = await this.prisma.signatureRequest.findFirst({
      where: { id, organizationId: actor.organizationId },
      select: { signatureLevel: true, signatureProvider: true },
    });
    if (pending?.signatureProvider === "GOVBR") {
      throw new BadRequestException(
        "Esta solicitação deve ser concluída pela autorização da conta Gov.br",
      );
    }
    if (
      pending?.signatureProvider === "ICP_BRASIL" ||
      pending?.signatureLevel === "QUALIFIED"
    ) {
      throw new BadRequestException(
        "Esta solicitação exige certificado ICP-Brasil e deve ser concluída pelo assinador Web PKI",
      );
    }
    const mfa = await this.prisma.userMfa.findUnique({
      where: { userId: actor.id },
    });
    if (!mfa?.enabled) {
      throw new BadRequestException(
        "Ative a verificação em duas etapas para usar a assinatura avançada",
      );
    }
    if (!verifyTotp(decryptSecret(mfa.secretEncrypted, this.mfaKey()), token)) {
      throw new BadRequestException("Código de verificação inválido ou expirado");
    }
    return this.completeSignature(actor, id, "SIGNED", undefined, context);
  }

  async reject(actor: AuthenticatedUser, id: string, reason: string) {
    const rejectionReason = reason.trim();
    if (!rejectionReason) {
      throw new BadRequestException("Informe o motivo da recusa");
    }
    return this.completeSignature(actor, id, "REJECTED", rejectionReason);
  }

  private async completeSignature(
    actor: AuthenticatedUser,
    id: string,
    status: "SIGNED" | "REJECTED",
    rejectionReason?: string,
    context: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    const current = await this.prisma.signatureRequest.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: {
        attachment: { select: { sha256: true, originalName: true, sizeBytes: true } },
        requestedTo: { select: { name: true } },
      },
    });
    if (!current || current.requestedToUserId !== actor.id) {
      throw new ForbiddenException(
        "Solicitação de assinatura não pertence ao usuário",
      );
    }
    if (current.status !== "PENDING") {
      throw new ConflictException("Solicitação de assinatura já respondida");
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const signedAt = new Date();
      const verificationCode = randomBytes(12).toString("hex").toUpperCase();
      const evidence: Prisma.InputJsonValue | null = status === "SIGNED" ? {
        version: 1,
        level: "ADVANCED",
        signatureRequestId: current.id,
        documentId: current.documentId,
        attachmentId: current.attachmentId,
        attachmentName: current.attachment?.originalName ?? null,
        attachmentSizeBytes: current.attachment?.sizeBytes ?? null,
        attachmentSha256: current.attachmentSha256 ?? current.attachment?.sha256 ?? null,
        signerUserId: actor.id,
        signerName: current.requestedTo.name,
        signedAt: signedAt.toISOString(),
        authentication: "TOTP",
        confirmationText: "Declaro que conferi o documento e manifesto minha assinatura eletrônica.",
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        verificationCode,
      } : null;
      const evidenceHash = evidence
        ? createHash("sha256").update(canonicalJson(evidence)).digest("hex")
        : null;
      const updated = await tx.signatureRequest.updateMany({
        where: {
          id,
          organizationId: actor.organizationId,
          requestedToUserId: actor.id,
          status: "PENDING",
        },
        data:
          status === "SIGNED"
            ? {
                status,
                signedAt,
                verificationCode,
                evidenceHash,
                evidenceJson: evidence as Prisma.InputJsonValue,
              }
            : { status, rejectedAt: new Date(), rejectionReason },
      });
      if (!updated.count) {
        throw new ConflictException("Solicitação de assinatura já respondida");
      }
      const completed = await tx.signatureRequest.findUniqueOrThrow({
        where: {
          id_organizationId: { id, organizationId: actor.organizationId },
        },
        include: {
          document: {
            select: {
              id: true,
              number: true,
              year: true,
              subject: true,
              body: true,
            },
          },
          requestedBy: { select: { id: true, name: true } },
          attachment: { select: { id: true, originalName: true, mimeType: true } },
        },
      });
      await tx.notification.create({
        data: {
          organizationId: actor.organizationId,
          userId: current.requestedByUserId,
          signatureRequestId: id,
          documentId: current.documentId,
          title:
            status === "SIGNED" ? "Documento assinado" : "Assinatura recusada",
          message:
            status === "SIGNED"
              ? "A solicitação de assinatura foi concluída."
              : `A solicitação de assinatura foi recusada: ${rejectionReason}`,
        },
      });
      return completed;
    });

    await this.push.sendToInternalUsers(
      actor.organizationId,
      [current.requestedByUserId],
      {
        title:
          status === "SIGNED" ? "Documento assinado" : "Assinatura recusada",
        body:
          status === "SIGNED"
            ? "Sua solicitação de assinatura foi concluída."
            : "Sua solicitação de assinatura foi recusada.",
        data: {
          route: "internal.signature",
          entityId: id,
          notificationType:
            status === "SIGNED" ? "SIGNATURE_SIGNED" : "SIGNATURE_REJECTED",
          badge: "refresh",
        },
      },
    );
    return request;
  }

  signatureCapabilities() {
    const provider = this.config.get<string>("ICP_BRASIL_PROVIDER")?.trim();
    const webPkiLicenseConfigured = Boolean(
      this.config.get<string>("WEB_PKI_LICENSE")?.trim(),
    );
    const restPkiConfigured = Boolean(
      this.config.get<string>("REST_PKI_ENDPOINT")?.trim() &&
        this.config.get<string>("REST_PKI_API_KEY")?.trim(),
    );
    const govbrConfigured = Boolean(
      this.config.get<string>("GOVBR_SIGNATURE_CLIENT_ID")?.trim() &&
        this.config.get<string>("GOVBR_SIGNATURE_CLIENT_SECRET")?.trim() &&
        this.config.get<string>("GOVBR_SIGNATURE_REDIRECT_URI")?.trim(),
    );
    return {
      advanced: { enabled: true, provider: "SD_Docs" },
      govbr: {
        enabled: false,
        configured: govbrConfigured,
        provider: "GOV.BR",
        level: "ADVANCED",
        requiresSilverOrGoldAccount: true,
        reason: govbrConfigured
          ? "Credenciais recebidas; ativação depende da homologação do órgão no GOV.BR."
          : "Aguardando credenciais de homologação solicitadas pelo gestor público.",
      },
      qualified: {
        enabled: false,
        configured: Boolean(provider && webPkiLicenseConfigured && restPkiConfigured),
        provider: provider || "Lacuna Web PKI / Rest PKI",
        requiresUserCertificate: true,
        supportedCertificates: ["A1", "A3", "CLOUD"],
        reason:
          provider && webPkiLicenseConfigured && restPkiConfigured
            ? "Credenciais recebidas; ativação depende da homologação do assinador."
            : "Integração ICP-Brasil aguardando licença e credenciais do provedor.",
      },
    };
  }

  async verifySignature(organizationId: string, code: string) {
    return this.signatureVerification(code, organizationId);
  }

  async verifyPublicSignature(code: string, publicUrl: string) {
    const result = await this.signatureVerification(code);
    return {
      ...result,
      qrCodeDataUrl: await QRCode.toDataURL(publicUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 220,
      }),
    };
  }

  private async signatureVerification(code: string, organizationId?: string) {
    const normalized = code.trim().toUpperCase();
    const signature = await this.prisma.signatureRequest.findFirst({
      where: {
        ...(organizationId ? { organizationId } : {}),
        verificationCode: normalized,
        status: "SIGNED",
      },
      select: {
        verificationCode: true,
        signatureLevel: true,
        signatureProvider: true,
        attachmentSha256: true,
        evidenceHash: true,
        evidenceJson: true,
        signedAt: true,
        attachment: { select: { originalName: true, sha256: true } },
        requestedTo: { select: { name: true } },
        document: { select: { number: true, year: true, subject: true } },
      },
    });
    if (!signature) throw new NotFoundException("Assinatura não encontrada");
    const calculatedEvidenceHash = createHash("sha256")
      .update(canonicalJson(signature.evidenceJson))
      .digest("hex");
    const attachmentIntegrity = Boolean(
      signature.attachmentSha256 &&
        signature.attachment?.sha256 === signature.attachmentSha256,
    );
    return {
      valid:
        calculatedEvidenceHash === signature.evidenceHash &&
        attachmentIntegrity,
      evidenceIntegrity: calculatedEvidenceHash === signature.evidenceHash,
      attachmentIntegrity,
      code: signature.verificationCode,
      level: signature.signatureLevel,
      provider: signature.signatureProvider,
      signedAt: signature.signedAt,
      signerName: signature.requestedTo.name,
      document: signature.document,
      attachment: signature.attachment,
      attachmentSha256: signature.attachmentSha256,
      evidenceHash: signature.evidenceHash,
    };
  }

  async notifications(userId: string, organizationId: string) {
    const items = await this.prisma.notification.findMany({
      where: { userId, organizationId },
      include: { signatureRequest: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      items,
      unreadCount: items.filter(({ readAt }) => !readAt).length,
    };
  }

  async markNotificationRead(
    userId: string,
    organizationId: string,
    notificationId: string,
  ) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, organizationId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count > 0 };
  }

  async markAllNotificationsRead(userId: string, organizationId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, organizationId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async account(userId: string, organizationId: string) {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, organizationId },
      select: {
        id: true,
        name: true,
        identity: { select: { email: true } },
        avatarUrl: true,
        profileLevel: true,
        cpf: true,
        registration: true,
        gender: true,
        birthDate: true,
        jobTitle: true,
        phoneAreaCode: true,
        landline: true,
        mobile: true,
        preferences: true,
        mfa: { select: { enabled: true, enabledAt: true } },
        userSectors: {
          where: { active: true },
          include: { sector: { select: { id: true, code: true, name: true } } },
        },
      },
    });
    const { identity, birthDate, ...userData } = user;
    return {
      ...userData,
      email: identity.email,
      birthDate: birthDate
        ? birthDate.toISOString().slice(0, 10)
        : null,
      mfa: user.mfa ?? { enabled: false, enabledAt: null },
    };
  }

  async updateAccount(actor: AuthenticatedUser, dto: UpdateAccountDto) {
    const {
      name,
      email,
      currentPassword,
      newPassword,
      newPasswordConfirm,
      jobTitle,
      landline,
      phoneAreaCode,
      mobile,
      cpf,
      registration,
      gender,
      birthDate,
      timezone,
      documentsPerPage,
      editorMode,
      attachmentViewMode,
      emailNotificationMode,
      mentionNotification,
      textualSignature,
      secondaryEmail,
      showMobileInPhones,
    } = dto;
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        identityId: true,
        identity: { select: { passwordHash: true } },
      },
    });
    if (!user?.identity?.passwordHash) {
      throw new UnauthorizedException("Senha inválida");
    }
    const passwordOk = await argon2.verify(
      user.identity.passwordHash,
      currentPassword,
    );
    if (!passwordOk) {
      throw new UnauthorizedException("Senha incorreta");
    }
    const wantsPasswordChange = Boolean(newPassword || newPasswordConfirm);
    if (wantsPasswordChange) {
      if (!newPassword || newPassword.length < 8) {
        throw new BadRequestException("A nova senha precisa ter no mínimo 8 caracteres");
      }
      if (newPassword !== newPasswordConfirm) {
        throw new BadRequestException("A confirmação da nova senha não confere");
      }
    }
    let parsedBirthDate: Date | null | undefined = undefined;
    if (birthDate !== undefined) {
      if (!birthDate.trim()) {
        parsedBirthDate = null;
      } else {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
        if (!match) {
          throw new BadRequestException("Data de nascimento inválida");
        }
        parsedBirthDate = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
        if (Number.isNaN(parsedBirthDate.getTime())) {
          throw new BadRequestException("Data de nascimento inválida");
        }
      }
    }
    const preferenceData = {
      timezone,
      documentsPerPage,
      editorMode,
      attachmentViewMode,
      emailNotificationMode,
      mentionNotification,
      textualSignature,
      secondaryEmail: secondaryEmail?.trim() || null,
      showMobileInPhones,
    };
    const passwordHash = wantsPasswordChange
      ? await argon2.hash(newPassword!)
      : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: actor.id },
        data: {
          name,
          jobTitle: jobTitle?.trim() || null,
          landline: landline?.trim() || null,
          phoneAreaCode: phoneAreaCode?.trim() || null,
          mobile: mobile?.trim() || null,
          cpf: cpf?.trim() || null,
          registration: registration?.trim() || null,
          gender: gender?.trim() || null,
          ...(parsedBirthDate !== undefined ? { birthDate: parsedBirthDate } : {}),
          identity: email
            ? {
                update: {
                  email: email.trim().toLowerCase(),
                  emailNormalized: email.trim().toLowerCase(),
                },
              }
            : undefined,
        },
      });
      if (passwordHash) {
        await tx.identity.update({
          where: { id: user.identityId },
          data: { passwordHash },
        });
      }
      await tx.userPreferences.upsert({
        where: { userId: actor.id },
        update: preferenceData,
        create: {
          userId: actor.id,
          organizationId: actor.organizationId,
          ...preferenceData,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          organizationId: actor.organizationId,
          action: "updated",
          entityType: "user_preferences",
          entityId: actor.id,
        },
      });
    });
    return this.account(actor.id, actor.organizationId);
  }

  async uploadAccountAvatar(
    actor: AuthenticatedUser,
    file: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (file.size > 20 * 1024 * 1024) {
      throw new BadRequestException("A foto deve ter no máximo 20 MB");
    }
    const extension = this.validAvatarExtension(file.mimetype, file.buffer);
    const key = `tenants/${actor.organizationId}/users/${actor.id}/avatar.${extension}`;
    await this.storage.put(key, file.buffer);
    const avatarUrl = `/docs/api/backend/users/${actor.id}/avatar?ext=${extension}&v=${Date.now()}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: actor.id },
        data: { avatarUrl },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          organizationId: actor.organizationId,
          action: "updated",
          entityType: "user_avatar",
          entityId: actor.id,
        },
      });
    });
    return this.account(actor.id, actor.organizationId);
  }

  async openAccountAvatar(actor: AuthenticatedUser, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: actor.organizationId, active: true },
      select: { avatarUrl: true },
    });
    if (!user?.avatarUrl) throw new NotFoundException("Foto não encontrada");
    const extension = new URL(user.avatarUrl, "http://local").searchParams.get(
      "ext",
    );
    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      webp: "image/webp",
    };
    if (!extension || !mimeTypes[extension]) {
      throw new NotFoundException("Foto não encontrada");
    }
    const asset = await this.storage.open(
      `tenants/${actor.organizationId}/users/${userId}/avatar.${extension}`,
    );
    return { ...asset, mimeType: mimeTypes[extension] };
  }

  private validAvatarExtension(mimeType: string, buffer: Buffer) {
    const png =
      mimeType === "image/png" &&
      buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
    const jpeg =
      mimeType === "image/jpeg" &&
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
    const webp =
      mimeType === "image/webp" &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP";
    if (png) return "png";
    if (jpeg) return "jpg";
    if (webp) return "webp";
    throw new BadRequestException("Envie uma imagem PNG, JPEG ou WebP válida");
  }

  career(userId: string) {
    return this.prisma.userSectorMembership.findMany({
      where: { userId },
      include: {
        sector: { select: { id: true, code: true, name: true } },
        changedBy: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
    });
  }

  async counterPasswordStatus(userId: string) {
    const current = await this.prisma.counterPassword.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, quantity: true, consumed: true, createdAt: true },
    });
    return { status: current ? "ACTIVE" : "NONE", current };
  }

  async generateCounterPassword(
    actor: AuthenticatedUser,
    dto: GenerateCounterPasswordDto,
  ) {
    const plaintext = randomBytes(24).toString("base64url");
    const hash = await argon2.hash(plaintext);
    const entity = await this.prisma.$transaction(async (tx) => {
      await tx.counterPassword.updateMany({
        where: {
          userId: actor.id,
          organizationId: actor.organizationId,
          active: true,
        },
        data: { active: false, invalidatedAt: new Date() },
      });
      const created = await tx.counterPassword.create({
        data: {
          userId: actor.id,
          organizationId: actor.organizationId,
          passwordHash: hash,
          quantity: dto.quantity,
        },
        select: { id: true, quantity: true, consumed: true, createdAt: true },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          organizationId: actor.organizationId,
          action: "generated",
          entityType: "counter_password",
          entityId: created.id,
          metadataJson: { quantity: dto.quantity },
        },
      });
      return created;
    });
    return { ...entity, counterPassword: plaintext };
  }

  async setupTotp(actor: AuthenticatedUser) {
    const existing = await this.prisma.userMfa.findUnique({
      where: { userId: actor.id },
    });
    if (existing?.enabled) {
      throw new BadRequestException("Autenticação dupla já está ativa");
    }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: {
        identity: { select: { email: true } },
        organization: {
          select: {
            displayName: true,
            branding: { select: { productName: true } },
          },
        },
      },
    });
    const secret = generateTotpSecret();
    const encrypted = encryptSecret(secret, this.mfaKey());
    await this.prisma.userMfa.upsert({
      where: { userId: actor.id },
      update: { secretEncrypted: encrypted, enabled: false, enabledAt: null },
      create: {
        userId: actor.id,
        organizationId: actor.organizationId,
        secretEncrypted: encrypted,
      },
    });
    const otpauthUri = generateTotpUri(
      user.organization.branding?.productName ?? user.organization.displayName,
      user.identity.email,
      secret,
    );
    return { otpauthUri, qrCodeDataUrl: await QRCode.toDataURL(otpauthUri) };
  }

  async confirmTotp(actor: AuthenticatedUser, token: string) {
    const mfa = await this.prisma.userMfa.findUnique({
      where: { userId: actor.id },
    });
    if (!mfa || mfa.enabled) {
      throw new BadRequestException(
        "Configuração TOTP pendente não encontrada",
      );
    }
    if (!verifyTotp(decryptSecret(mfa.secretEncrypted, this.mfaKey()), token)) {
      throw new BadRequestException("Token TOTP inválido");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.userMfa.update({
        where: { userId: actor.id },
        data: { enabled: true, enabledAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          organizationId: actor.organizationId,
          action: "enabled",
          entityType: "user_mfa",
          entityId: actor.id,
        },
      });
    });
    return { enabled: true };
  }

  reports(actor: AuthenticatedUser) {
    return {
      scope: actor.permissions.includes(PERMISSIONS.analyticsGeneral)
        ? "ORGANIZATION"
        : "SECTOR",
      sections: [
        "indicators",
        "documents",
        "usage",
        "quantitative",
        "map",
        "statistics",
        "consumption",
        "charts",
        "access",
        "logs",
      ],
      data: [],
      formulas: "Indisponível nesta versão",
    };
  }

  private mfaKey() {
    return this.config.getOrThrow<string>("MFA_ENCRYPTION_KEY");
  }

  private canManageTemplates(actor: AuthenticatedUser) {
    return actor.permissions.some((key) =>
      [PERMISSIONS.templatesManage, PERMISSIONS.templatesManageSector].includes(
        key as never,
      ),
    );
  }

  private assertTemplateScope(
    actor: AuthenticatedUser,
    scope: TemplateScope,
    sectorId: string | undefined,
  ) {
    if (!this.canManageTemplates(actor)) {
      throw new ForbiddenException("Permissão insuficiente");
    }
    if (scope === "USER") {
      if (sectorId) {
        throw new BadRequestException("Texto pessoal não possui unidade.");
      }
      return;
    }
    if (scope === "ORGANIZATION") {
      if (sectorId) {
        throw new BadRequestException("Texto institucional não possui unidade.");
      }
      if (!actor.permissions.includes(PERMISSIONS.templatesManage)) {
        throw new ForbiddenException(
          "Somente Administrador publica texto padrão para toda a instituição.",
        );
      }
      return;
    }
    if (!sectorId) {
      throw new BadRequestException(
        "Informe a unidade para texto da unidade.",
      );
    }
  }

  private async requireActiveUserSector(
    actor: AuthenticatedUser,
    sectorId: string,
  ) {
    const sector = await this.prisma.sector.findFirst({
      where: { id: sectorId, organizationId: actor.organizationId },
    });
    if (!sector) throw new BadRequestException("Unidade inválida");
    if (actor.permissions.includes(PERMISSIONS.templatesManage)) return;
    const membership = await this.prisma.userSector.findFirst({
      where: { userId: actor.id, sectorId, active: true },
    });
    if (!membership)
      throw new ForbiddenException("Unidade fora do escopo do usuário");
  }
}
