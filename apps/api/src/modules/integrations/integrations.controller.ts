import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';
import { IntegrationsHealthService } from './integrations-health.service';

class UpdateIntegrationBody {
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsObject() config?: Record<string, string>;
}

/// Integration Hub admin console API. Lists every external-integration domain,
/// its providers + config, and lets an admin switch provider, set config
/// (secrets encrypted), toggle it, and run a health check.
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/integrations')
export class IntegrationsController {
  constructor(
    private integrations: IntegrationsService,
    private health: IntegrationsHealthService,
  ) {}

  @Get()
  list() {
    return this.integrations.list();
  }

  @Get(':domain')
  get(@Param('domain') domain: string) {
    return this.integrations.get(domain);
  }

  @Patch(':domain')
  update(
    @Param('domain') domain: string,
    @Body() body: UpdateIntegrationBody,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.integrations.update(domain, body, actor);
  }

  @Post(':domain/test')
  test(@Param('domain') domain: string) {
    return this.health.test(domain);
  }
}
