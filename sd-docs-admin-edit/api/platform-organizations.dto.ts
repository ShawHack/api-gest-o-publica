import { OrganizationStatus } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

const SLUG_PATTERN = /^[a-zA-Z0-9À-ÿ]+(?:[-_\s][a-zA-Z0-9À-ÿ]+)*$/;
const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export class ListPlatformOrganizationsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(["ALL", ...Object.values(OrganizationStatus)])
  @IsOptional()
  status: "ALL" | OrganizationStatus = "ALL";

  @IsString()
  @IsOptional()
  organizationType?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize = 20;

  @IsIn(["createdAt", "updatedAt", "name", "displayName"])
  @IsOptional()
  sortBy: "createdAt" | "updatedAt" | "name" | "displayName" = "createdAt";

  @IsIn(["asc", "desc"])
  @IsOptional()
  sortOrder: "asc" | "desc" = "desc";
}

export class CreatePlatformOrganizationMetadataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  displayName: string;

  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(120)
  slug: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  documentNumber?: string;

  @IsEmail()
  @IsOptional()
  institutionalEmail?: string;

  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @IsOptional()
  websiteUrl?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  phone?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  organizationType?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  documentFooterAddress?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  city?: string;

  @Matches(/^[a-zA-Z]{2}$/)
  @IsOptional()
  stateCode?: string;

  @Matches(/^[a-zA-Z]{2}$/)
  @IsOptional()
  countryCode?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  sizeCategory?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  printFont?: string;

  @IsDateString()
  @IsOptional()
  trialEndsAt?: string;
}

export class PlatformOrganizationDomainDto {
  @IsString()
  @Matches(HOSTNAME_PATTERN)
  hostname: string;
}

export class PlatformOrganizationBrandingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  shortName: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  productName?: string;

  @Matches(COLOR_PATTERN)
  @IsOptional()
  primaryColor?: string;

  @Matches(COLOR_PATTERN)
  @IsOptional()
  primaryHoverColor?: string;

  @Matches(COLOR_PATTERN)
  @IsOptional()
  linkColor?: string;

  @Matches(COLOR_PATTERN)
  @IsOptional()
  accentColor?: string;
}

export class PlatformInitialAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class CreatePlatformOrganizationDto {
  @ValidateNested()
  @Type(() => CreatePlatformOrganizationMetadataDto)
  organization: CreatePlatformOrganizationMetadataDto;

  @ValidateNested()
  @Type(() => PlatformOrganizationDomainDto)
  domain: PlatformOrganizationDomainDto;

  @ValidateNested()
  @Type(() => PlatformOrganizationBrandingDto)
  branding: PlatformOrganizationBrandingDto;

  @ValidateNested()
  @Type(() => PlatformInitialAdminDto)
  initialAdmin: PlatformInitialAdminDto;
}

export class UpdatePlatformOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  displayName?: string;

  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(120)
  @IsOptional()
  slug?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  documentNumber?: string;

  @IsEmail()
  @IsOptional()
  institutionalEmail?: string;

  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @IsOptional()
  websiteUrl?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  phone?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  organizationType?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  documentFooterAddress?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  city?: string;

  @Matches(/^[a-zA-Z]{2}$/)
  @IsOptional()
  stateCode?: string;

  @Matches(/^[a-zA-Z]{2}$/)
  @IsOptional()
  countryCode?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  sizeCategory?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  printFont?: string;

  @IsDateString()
  @IsOptional()
  trialEndsAt?: string;
}

export class UpdatePlatformOrganizationAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class PlatformOrganizationTransitionDto {
  @Transform((params) => {
    const value: unknown = params.value;
    return typeof value === "string" ? value.trim() : value;
  })
  @IsString()
  @MinLength(3)
  reason: string;
}
