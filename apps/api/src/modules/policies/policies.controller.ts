import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PoliciesService } from './policies.service';
import { AssignClientDto, CreateGroupDto, UpdateGroupDto } from './dto/policy.dto';

@ApiTags('policies')
@ApiBearerAuth()
@Controller('policies')
export class PoliciesController {
  constructor(private policies: PoliciesService) {}

  /** The effective policy for the acting client company (authed, any role). */
  @Get('mine')
  mine(@CurrentUser() actor: AuthUser) {
    return this.policies.effectiveForCompany(actor.companyId);
  }

  // ─── Admin: group management ─────────────────────────────────
  @Get('groups')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  listGroups() {
    return this.policies.listGroups();
  }

  @Post('groups')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  createGroup(@Body() dto: CreateGroupDto) {
    return this.policies.createGroup(dto);
  }

  @Put('groups/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  updateGroup(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.policies.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  deleteGroup(@Param('id') id: string) {
    return this.policies.deleteGroup(id);
  }

  @Post('assign')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  assign(@Body() dto: AssignClientDto) {
    return this.policies.assignClient(dto.clientId, dto.groupId ?? null);
  }
}
