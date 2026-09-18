import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  PlatformAuthGuard,
  PlatformPermissionGuard,
  RequirePlatformPermissions,
} from "./platform-auth.guards";
import type { PlatformAuthenticatedRequest } from "./platform-auth.types";
import {
  CreatePlatformOrganizationDto,
  ListPlatformOrganizationsDto,
  PlatformOrganizationTransitionDto,
  UpdatePlatformOrganizationAdminDto,
  UpdatePlatformOrganizationDto,
} from "./platform-organizations.dto";
import { PlatformOrganizationsService } from "./platform-organizations.service";

@Controller("platform/organizations")
@UseGuards(PlatformAuthGuard, PlatformPermissionGuard)
export class PlatformOrganizationsController {
  constructor(private readonly organizations: PlatformOrganizationsService) {}

  @Get()
  @RequirePlatformPermissions("organization.read")
  list(@Query() query: ListPlatformOrganizationsDto) {
    return this.organizations.list(query);
  }

  @Post()
  @RequirePlatformPermissions("organization.create")
  create(
    @Body() dto: CreatePlatformOrganizationDto,
    @Req() request: PlatformAuthenticatedRequest,
  ) {
    return this.organizations.create(request.user.id, dto, request);
  }

  @Get(":id")
  @RequirePlatformPermissions("organization.read")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.organizations.get(id);
  }

  @Patch(":id")
  @RequirePlatformPermissions("organization.update")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformOrganizationDto,
    @Req() request: PlatformAuthenticatedRequest,
  ) {
    return this.organizations.update(id, request.user.id, dto, request);
  }

  @Patch(":id/initial-admin")
  @RequirePlatformPermissions("organization.update")
  updateInitialAdmin(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformOrganizationAdminDto,
    @Req() request: PlatformAuthenticatedRequest,
  ) {
    return this.organizations.updateInitialAdmin(
      id,
      request.user.id,
      dto,
      request,
    );
  }

  @Post(":id/suspend")
  @RequirePlatformPermissions("organization.suspend")
  suspend(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PlatformOrganizationTransitionDto,
    @Req() request: PlatformAuthenticatedRequest,
  ) {
    return this.organizations.suspend(
      id,
      request.user.id,
      dto.reason,
      request,
    );
  }

  @Post(":id/reactivate")
  @RequirePlatformPermissions("organization.reactivate")
  reactivate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PlatformOrganizationTransitionDto,
    @Req() request: PlatformAuthenticatedRequest,
  ) {
    return this.organizations.reactivate(
      id,
      request.user.id,
      dto.reason,
      request,
    );
  }
}
