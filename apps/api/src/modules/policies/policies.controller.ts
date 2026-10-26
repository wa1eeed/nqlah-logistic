import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Audit } from '../../common/audit/audit.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PoliciesService } from './policies.service';
import { SubscriptionsService } from './subscriptions.service';
import {
  AssignClientDto, AssignPlanDto, CreateCarrierGroupDto, CreateGroupDto, CreatePlanDto,
  CreatePlanModuleDto, UpdateCarrierGroupDto, UpdateGroupDto, UpdatePlanDto, UpdatePlanModuleDto,
} from './dto/policy.dto';

@ApiTags('policies')
@ApiBearerAuth()
@Controller('policies')
export class PoliciesController {
  constructor(private policies: PoliciesService, private subscriptions: SubscriptionsService) {}

  /** The effective policy for the acting client company (authed, any role). */
  @Get('mine')
  mine(@CurrentUser() actor: AuthUser) {
    return this.policies.effectiveForCompany(actor.companyId);
  }

  /** The carriers the acting client may target for a DIRECT order (visible subset). */
  @Get('visible-carriers')
  visibleCarriers(@CurrentUser() actor: AuthUser) {
    return this.policies.visibleCarriersForClient(actor.companyId);
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

  // ─── Admin: provider (carrier) groups ────────────────────────
  @Get('carrier-groups')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  listCarrierGroups() {
    return this.policies.listCarrierGroups();
  }

  @Post('carrier-groups')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  createCarrierGroup(@Body() dto: CreateCarrierGroupDto) {
    return this.policies.createCarrierGroup(dto);
  }

  @Put('carrier-groups/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  updateCarrierGroup(@Param('id') id: string, @Body() dto: UpdateCarrierGroupDto) {
    return this.policies.updateCarrierGroup(id, dto);
  }

  @Delete('carrier-groups/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  deleteCarrierGroup(@Param('id') id: string) {
    return this.policies.deleteCarrierGroup(id);
  }

  // Public: the active plans offered to a given audience at signup (no auth).
  @Public()
  @Get('plans/public')
  publicPlans(@Query('audience') audience?: string) {
    return this.policies.listPublicPlans(audience);
  }

  // ─── Admin: Plans (memberships) ──────────────────────────────
  @Get('plans')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  listPlans() {
    return this.policies.listPlans();
  }

  @Post('plans')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @Audit({ action: 'policy.plan.create', resourceType: 'Plan' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.policies.createPlan(dto);
  }

  @Put('plans/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @Audit({ action: 'policy.plan.update', resourceType: 'Plan', idFrom: 'param', idKey: 'id' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.policies.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @Audit({ action: 'policy.plan.delete', resourceType: 'Plan', idFrom: 'param', idKey: 'id' })
  deletePlan(@Param('id') id: string, @Query('reassignTo') reassignTo?: string, @Query('detach') detach?: string) {
    return this.policies.deletePlan(id, { reassignToId: reassignTo || undefined, detach: detach === 'true' });
  }

  @Post('assign-plan')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @Audit({ action: 'policy.plan.assign', resourceType: 'Company', idFrom: 'body', idKey: 'companyId' })
  assignPlan(@Body() dto: AssignPlanDto) {
    return this.policies.assignPlan(dto.companyId, dto.planId ?? null);
  }

  // ─── Admin: Plan modules (priced capability catalog) ─────────
  @Get('plan-modules')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  listPlanModules() {
    return this.policies.listPlanModules();
  }

  @Post('plan-modules')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @Audit({ action: 'policy.planModule.create', resourceType: 'PlanModule' })
  createPlanModule(@Body() dto: CreatePlanModuleDto) {
    return this.policies.createPlanModule(dto);
  }

  @Put('plan-modules/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @Audit({ action: 'policy.planModule.update', resourceType: 'PlanModule', idFrom: 'param', idKey: 'id' })
  updatePlanModule(@Param('id') id: string, @Body() dto: UpdatePlanModuleDto) {
    return this.policies.updatePlanModule(id, dto);
  }

  @Delete('plan-modules/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @Audit({ action: 'policy.planModule.delete', resourceType: 'PlanModule', idFrom: 'param', idKey: 'id' })
  deletePlanModule(@Param('id') id: string) {
    return this.policies.deletePlanModule(id);
  }

  // ─── Subscriptions ───────────────────────────────────────────
  /** The caller's own company subscription (carrier/client apps). */
  @Get('subscription/mine')
  mySubscription(@CurrentUser() actor: AuthUser) {
    return actor.companyId ? this.subscriptions.withPlan(actor.companyId) : null;
  }

  /** The caller subscribes their own company to a plan (self-service). */
  @Post('subscription/subscribe')
  @Audit({ action: 'subscription.subscribe', resourceType: 'Subscription', idFrom: 'body', idKey: 'planId' })
  subscribe(@CurrentUser() actor: AuthUser, @Body() body: { planId: string; billingCycle?: 'MONTHLY' | 'YEARLY' }) {
    return this.subscriptions.subscribe(actor.companyId!, body.planId, body.billingCycle);
  }

  /** The caller cancels their own subscription (at period end by default). */
  @Post('subscription/cancel')
  @Audit({ action: 'subscription.cancel', resourceType: 'Subscription' })
  cancelSubscription(@CurrentUser() actor: AuthUser, @Body() body: { immediate?: boolean }) {
    return this.subscriptions.cancel(actor.companyId!, !body?.immediate);
  }

  /** Admin: view a specific company's subscription. */
  @Get('subscription/:companyId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  companySubscription(@Param('companyId') companyId: string) {
    return this.subscriptions.withPlan(companyId);
  }
}
