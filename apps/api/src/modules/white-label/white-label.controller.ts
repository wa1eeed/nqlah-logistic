import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Audit } from '../../common/audit/audit.decorator';
import { WhiteLabelService } from './white-label.service';

class BrandingDto {
  @IsOptional() @IsString() brandName?: string;
  @IsOptional() @IsString() brandLogo?: string;
  @IsOptional() @IsString() brandColor?: string;
}
class SetEnabledDto {
  @IsBoolean() enabled!: boolean;
}

@ApiTags('white-label')
@ApiBearerAuth()
@Controller()
export class WhiteLabelController {
  constructor(private wl: WhiteLabelService) {}

  /** The acting carrier's branding + whether white-label is enabled. */
  @Get('carrier/branding')
  mine(@CurrentUser() actor: AuthUser) {
    return this.wl.mine(actor);
  }

  @Patch('carrier/branding')
  @Audit({ action: 'carrier.branding.update', resourceType: 'Company' })
  update(@Body() dto: BrandingDto, @CurrentUser() actor: AuthUser) {
    return this.wl.update(actor, dto);
  }

  /** Admin: enable/disable the white-label subscription for a carrier. */
  @Patch('admin/companies/:id/white-label')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @Audit({ action: 'admin.whiteLabel.set', resourceType: 'Company', idFrom: 'param', idKey: 'id' })
  setEnabled(@Param('id') id: string, @Body() dto: SetEnabledDto) {
    return this.wl.setEnabled(id, dto.enabled);
  }
}
