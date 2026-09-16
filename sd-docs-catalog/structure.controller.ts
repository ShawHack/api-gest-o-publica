import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PERMISSIONS } from "../access/access-policy";
import {
  JwtAuthGuard,
  PermissionsGuard,
  RequireAnyPermissions,
  RequirePermissions,
} from "../auth/auth.guards";
import type { AuthenticatedRequest } from "../auth/auth.types";
import {
  CreateServiceCharterDto,
  CreateSignerListDto,
  CreateTemplateDto,
  GenerateCounterPasswordDto,
  PersonQueryDto,
  RejectSignatureDto,
  SendListQueryDto,
  SignatureQueueQueryDto,
  SignSignatureDto,
  SignerListQueryDto,
  TemplateQueryDto,
  TotpTokenDto,
  UpdateAccountDto,
  UpdateServiceCharterDto,
} from "./structure.dto";
import { StructureService } from "./structure.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StructureController {
  constructor(private readonly structure: StructureService) {}

  @Get("structure/response-templates")
  @RequireAnyPermissions(
    PERMISSIONS.templatesManage,
    PERMISSIONS.templatesManageSector,
  )
  templates(
    @Req() req: AuthenticatedRequest,
    @Query() query: TemplateQueryDto,
  ) {
    return this.structure.listTemplates(req.user, query.scope, query.sectorId);
  }

  @Post("structure/response-templates")
  @RequireAnyPermissions(
    PERMISSIONS.templatesManage,
    PERMISSIONS.templatesManageSector,
  )
  createTemplate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.structure.createTemplate(req.user, dto);
  }

  @Get("structure/signer-lists")
  @RequirePermissions(PERMISSIONS.signerListsManage)
  signerLists(
    @Req() req: AuthenticatedRequest,
    @Query() query: SignerListQueryDto,
  ) {
    return this.structure.listSignerLists(
      req.user,
      query.context,
      query.sectorId,
    );
  }

  @Post("structure/signer-lists")
  @RequirePermissions(PERMISSIONS.signerListsManage)
  createSignerList(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSignerListDto,
  ) {
    return this.structure.createSignerList(req.user, dto);
  }

  @Get("structure/send-lists")
  @RequirePermissions(PERMISSIONS.sendListsManage)
  sendLists(
    @Req() req: AuthenticatedRequest,
    @Query() query: SendListQueryDto,
  ) {
    return this.structure.listSendLists(req.user.organizationId, query.status);
  }

  @Get("structure/service-charters")
  @RequirePermissions(PERMISSIONS.serviceChartersManage)
  serviceCharters(
    @Req() req: AuthenticatedRequest,
    @Query() query: SendListQueryDto,
  ) {
    return this.structure.listServiceCharters(
      req.user.organizationId,
      query.status,
    );
  }

  @Get("structure/attachment-file-names")
  @RequireAnyPermissions(
    PERMISSIONS.serviceChartersManage,
    PERMISSIONS.taxonomiesManage,
  )
  attachmentFileNames(@Req() req: AuthenticatedRequest) {
    return this.structure.listAttachmentFileNames(req.user.organizationId);
  }

  @Get("structure/service-charters/tree")
  @RequirePermissions(PERMISSIONS.serviceChartersManage)
  serviceCharterTree(
    @Req() req: AuthenticatedRequest,
    @Query() query: SendListQueryDto,
  ) {
    return this.structure.serviceCharterTree(
      req.user.organizationId,
      query.status,
    );
  }

  @Post("structure/service-charters")
  @RequirePermissions(PERMISSIONS.serviceChartersManage)
  createServiceCharter(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateServiceCharterDto,
  ) {
    return this.structure.createServiceCharter(req.user, dto);
  }

  @Patch("structure/service-charters/:id")
  @RequirePermissions(PERMISSIONS.serviceChartersManage)
  updateServiceCharter(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceCharterDto,
  ) {
    return this.structure.updateServiceCharter(req.user, id, dto);
  }

  @Delete("structure/service-charters/:id")
  @RequirePermissions(PERMISSIONS.serviceChartersManage)
  removeServiceCharter(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.structure.removeServiceCharter(req.user, id);
  }

  @Post("structure/service-charters/:id/icon")
  @RequirePermissions(PERMISSIONS.serviceChartersManage)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  uploadServiceCharterIcon(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile()
    file:
      | { buffer: Buffer; mimetype: string; size: number; originalname: string }
      | undefined,
  ) {
    if (!file) throw new BadRequestException("Selecione um ícone");
    return this.structure.uploadServiceCharterIcon(req.user, id, file);
  }

  @Get("structure/service-charters/:id/icon")
  @RequirePermissions(PERMISSIONS.serviceChartersManage)
  @Header("Cache-Control", "private, max-age=300")
  @Header("X-Content-Type-Options", "nosniff")
  async serviceCharterIcon(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const asset = await this.structure.openServiceCharterIcon(req.user, id);
    return new StreamableFile(asset.stream, { type: asset.mimeType });
  }

  @Get("structure/document-roles")
  @RequirePermissions(PERMISSIONS.documentRolesManage)
  documentRoles(@Req() req: AuthenticatedRequest) {
    return this.structure.listDocumentRoles(req.user.organizationId);
  }

  @Get("structure/persons")
  @RequirePermissions(PERMISSIONS.structureRead)
  persons(@Req() req: AuthenticatedRequest, @Query() query: PersonQueryDto) {
    return this.structure.listPersons(req.user.organizationId, query);
  }

  @Get("structure/person-lists")
  @RequirePermissions(PERMISSIONS.structureRead)
  personLists(@Req() req: AuthenticatedRequest) {
    return this.structure.listPersonLists(req.user.organizationId);
  }

  @Get("me/signatures")
  @RequirePermissions(PERMISSIONS.signaturesSelf)
  signatures(
    @Req() req: AuthenticatedRequest,
    @Query() query: SignatureQueueQueryDto,
  ) {
    return this.structure.signatureQueue(
      req.user.id,
      req.user.organizationId,
      query.status,
    );
  }

  @Post("me/signatures/:id/sign")
  @RequirePermissions(PERMISSIONS.signaturesSelf)
  signSignature(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SignSignatureDto,
  ) {
    if (!dto.confirmation) {
      throw new BadRequestException("Confirme a assinatura para continuar");
    }
    return this.structure.sign(req.user, id, dto.token ?? "", {
      ipAddress:
        (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
        req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Post("me/signatures/:id/reject")
  @RequirePermissions(PERMISSIONS.signaturesSelf)
  rejectSignature(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectSignatureDto,
  ) {
    return this.structure.reject(req.user, id, dto.reason);
  }

  @Get("me/notifications")
  notifications(@Req() req: AuthenticatedRequest) {
    return this.structure.notifications(req.user.id, req.user.organizationId);
  }

  @Patch("me/notifications/read-all")
  markAllNotificationsRead(@Req() req: AuthenticatedRequest) {
    return this.structure.markAllNotificationsRead(
      req.user.id,
      req.user.organizationId,
    );
  }

  @Patch("me/notifications/:id/read")
  markNotificationRead(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.structure.markNotificationRead(
      req.user.id,
      req.user.organizationId,
      id,
    );
  }

  @Get("me/account")
  @RequirePermissions(PERMISSIONS.accountSelf)
  account(@Req() req: AuthenticatedRequest) {
    return this.structure.account(req.user.id, req.user.organizationId);
  }

  @Patch("me/account")
  @RequirePermissions(PERMISSIONS.accountSelf)
  updateAccount(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.structure.updateAccount(req.user, dto);
  }

  @Post("me/account/avatar")
  @RequirePermissions(PERMISSIONS.accountSelf)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  uploadAccountAvatar(
    @Req() req: AuthenticatedRequest,
    @UploadedFile()
    file:
      | { buffer: Buffer; mimetype: string; size: number; originalname: string }
      | undefined,
  ) {
    if (!file) throw new BadRequestException("Selecione uma imagem");
    return this.structure.uploadAccountAvatar(req.user, file);
  }

  @Get("users/:id/avatar")
  @RequirePermissions(PERMISSIONS.accountSelf)
  @Header("Cache-Control", "private, max-age=300")
  @Header("X-Content-Type-Options", "nosniff")
  async accountAvatar(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const avatar = await this.structure.openAccountAvatar(req.user, id);
    return new StreamableFile(avatar.stream, { type: avatar.mimeType });
  }

  @Get("me/career")
  @RequirePermissions(PERMISSIONS.accountSelf)
  career(@Req() req: AuthenticatedRequest) {
    return this.structure.career(req.user.id);
  }

  @Get("me/counter-password")
  @RequireAnyPermissions(
    PERMISSIONS.counterPasswordDraft,
    PERMISSIONS.counterPasswordSign,
  )
  counterPasswordStatus(@Req() req: AuthenticatedRequest) {
    return this.structure.counterPasswordStatus(req.user.id);
  }

  @Post("me/counter-password/generate")
  @RequireAnyPermissions(
    PERMISSIONS.counterPasswordDraft,
    PERMISSIONS.counterPasswordSign,
  )
  generateCounterPassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GenerateCounterPasswordDto,
  ) {
    return this.structure.generateCounterPassword(req.user, dto);
  }

  @Post("me/mfa/totp/setup")
  @RequirePermissions(PERMISSIONS.accountSelf)
  setupTotp(@Req() req: AuthenticatedRequest) {
    return this.structure.setupTotp(req.user);
  }

  @Post("me/mfa/totp/confirm")
  @RequirePermissions(PERMISSIONS.accountSelf)
  confirmTotp(@Req() req: AuthenticatedRequest, @Body() dto: TotpTokenDto) {
    return this.structure.confirmTotp(req.user, dto.token);
  }

  @Get("reports")
  @RequireAnyPermissions(
    PERMISSIONS.analyticsGeneral,
    PERMISSIONS.analyticsSector,
  )
  reports(@Req() req: AuthenticatedRequest) {
    return this.structure.reports(req.user);
  }
}
