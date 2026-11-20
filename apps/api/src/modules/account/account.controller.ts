import { Controller, Delete, ForbiddenException, Get, Headers, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AccountService } from './account.service';

/**
 * Self-service account endpoints for the signed-in user. The deletion flow
 * satisfies Apple App Review 5.1.1(v): the user can request real deletion of
 * their account from inside the app. Authenticated (global JwtAuthGuard).
 */
@ApiTags('account')
@ApiBearerAuth()
@Controller('account')
export class AccountController {
  constructor(private account: AccountService) {}

  /** Current deletion status + whether deletion is allowed + what's blocking it. */
  @Get('deletion')
  deletionOverview(@CurrentUser() actor: AuthUser) {
    return this.account.deletionOverview(actor.id, actor.companyId);
  }

  /** Request account deletion — freezes now, purges after the grace period.
   *  Blocked (with the pending items) while orders are active or dues unpaid. */
  @Post('deletion')
  @Audit({ action: 'account.deletion.request', resourceType: 'User' })
  requestDeletion(@CurrentUser() actor: AuthUser) {
    return this.account.requestDeletion(actor.id, actor.companyId);
  }

  /** Cancel a pending deletion during the grace window and reactivate. */
  @Delete('deletion')
  @Audit({ action: 'account.deletion.cancel', resourceType: 'User' })
  cancelDeletion(@CurrentUser() actor: AuthUser) {
    return this.account.cancelDeletion(actor.id);
  }

  /**
   * Scheduled purge of accounts past their 30-day grace window (anonymize PII).
   * Authenticated by the deploy-token header (same shared secret as the version
   * hook), so a daily Coolify/external cron can call it without a user login.
   * See docs/DEPLOYMENT.md for the cron setup.
   */
  @Public()
  @Post('deletion/purge')
  purgeExpired(@Headers('x-deploy-token') token?: string) {
    const secret = process.env.APP_VERSION_DEPLOY_TOKEN;
    if (!secret || token !== secret) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'رمز غير صالح' });
    }
    return this.account.purgeExpiredDeletions();
  }
}
