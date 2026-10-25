import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { OwnedClientsService } from './owned-clients.service';

class CreateOwnedClientDto {
  @IsString() companyNameAr!: string;
  @IsOptional() @IsString() companyNameEn?: string;
  @IsString() city!: string;
  @IsString() region!: string;
  @IsString() contactPhone!: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsString() phone!: string;
  @IsString() @MinLength(8) password!: string;
}

@ApiTags('owned-clients')
@ApiBearerAuth()
@Controller('carrier/clients')
export class OwnedClientsController {
  constructor(private owned: OwnedClientsService) {}

  /** The carrier's own private clients. */
  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.owned.list(actor);
  }

  /** Register a new private client under the acting carrier. */
  @Post()
  @Audit({ action: 'carrier.client.create', resourceType: 'Company', idFrom: 'response' })
  create(@Body() dto: CreateOwnedClientDto, @CurrentUser() actor: AuthUser) {
    return this.owned.create(dto, actor);
  }
}
