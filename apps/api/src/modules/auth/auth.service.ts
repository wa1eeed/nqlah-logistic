import {
  BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { LoginAttemptService } from '../../common/security/login-attempt.service';
import { OtpService } from '../../common/security/otp.service';
import { TokenBlacklistService } from '../../common/security/token-blacklist.service';
import { SubscriptionsService } from '../policies/subscriptions.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { normalizeSaudiPhone } from '@naqla/shared-utils';
import { companyCode, driverCode } from '../../common/codes';
import { EMAIL_CONNECTOR, type EmailConnector } from '../../integrations/email/email.connector';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditLogService,
    private attempts: LoginAttemptService,
    private otp: OtpService,
    private blacklist: TokenBlacklistService,
    private subscriptions: SubscriptionsService,
    @Inject(EMAIL_CONNECTOR) private email: EmailConnector,
  ) {}

  /**
   * Resolve the plan to bind at signup: the chosen plan when it's valid for the
   * company's audience, else the default active plan for that audience, else null.
   */
  private async resolveSignupPlan(planId: string | undefined, companyType: 'CLIENT' | 'CARRIER'): Promise<string | null> {
    if (planId) {
      const chosen = await this.prisma.plan.findUnique({ where: { id: planId }, select: { id: true, active: true, audience: true } });
      if (chosen?.active && (chosen.audience === companyType || chosen.audience === 'BOTH')) return chosen.id;
    }
    const def = await this.prisma.plan.findFirst({
      where: { isDefault: true, active: true, audience: { in: [companyType, 'BOTH'] } },
      orderBy: { audience: 'asc' }, // prefer the audience-specific default over BOTH
      select: { id: true },
    });
    return def?.id ?? null;
  }

  // ─── Register (Phone-first, email optional) ─────────────────────

  async register(dto: RegisterDto, meta: { ip?: string; userAgent?: string } = {}) {
    if (!(dto.acceptedTerms && dto.acceptedPrivacy && dto.acceptedTransport)) {
      throw new BadRequestException({
        code: 'LEGAL_CONSENT_REQUIRED',
        message: 'يجب الموافقة على شروط الاستخدام، سياسة الخصوصية، وشروط النقل',
      });
    }

    const phone = normalizeSaudiPhone(dto.phone);
    const email = dto.email?.toLowerCase();

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone }, ...(email ? [{ email }] : [])] },
    });
    if (existing) {
      throw new ConflictException({ code: 'USER_EXISTS', message: 'هذا المستخدم مسجل مسبقاً' });
    }

    const passwordHash = await bcrypt.hash(dto.password, Number(process.env.BCRYPT_ROUNDS ?? 12));

    // A VAT-registered carrier COMPANY must provide its 15-digit VAT number.
    const entityType = dto.accountType === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'COMPANY';
    const vatRegistered = dto.vatRegistered ?? true;
    if (dto.companyType === 'CARRIER' && entityType === 'COMPANY' && vatRegistered && !dto.vatNumber) {
      throw new BadRequestException({ code: 'VAT_NUMBER_REQUIRED', message: 'الرقم الضريبي مطلوب لمنشأة نقل مسجّلة في ضريبة القيمة المضافة' });
    }
    const company = await this.prisma.company.create({
      data: {
        type: dto.companyType,
        code: companyCode(),
        entityType,
        crNumber: dto.crNumber ?? null,
        vatNumber: dto.vatNumber ?? null,
        vatRegistered,
        nameAr: dto.companyNameAr,
        nameEn: dto.companyNameEn,
        city: dto.city,
        region: dto.region,
        contactPhone: dto.contactPhone,
        // Company.contactEmail is required by the schema. If user didn't provide
        // either an account email or a contact email, synthesize one from the
        // phone — purely structural, no email will ever be sent here.
        contactEmail: dto.contactEmail ?? email ?? `noreply+${phone}@phone.${process.env.APP_DOMAIN ?? 'nqlah.nx.sa'}`,
        documents: dto.documents ?? undefined,
      },
    });

    // Bind a subscription plan at registration: the chosen plan (validated for
    // this audience) or the default plan for it. A free/default plan activates
    // immediately; a paid one starts its trial. Non-blocking — a failure here
    // must not fail signup (the company just falls back to the default policy).
    try {
      const planId = await this.resolveSignupPlan(dto.planId, dto.companyType);
      if (planId) await this.subscriptions.subscribe(company.id, planId);
    } catch { /* ignore — registration succeeds without a subscription */ }

    const user = await this.prisma.user.create({
      data: {
        phone,
        email: email ?? null,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        nationalId: dto.nationalId,
        role: dto.companyType === 'CLIENT' ? 'CLIENT_ADMIN' : 'CARRIER_ADMIN',
        companyId: company.id,
        // The first user of a newly-registered company is the OWNER. The OWNER
        // role is permanent — only invitable members get other roles.
        companyRole: 'OWNER' as never,
        // Phone is not verified yet — user must complete OTP step
        isPhoneVerified: false,
        // Email never receives an OTP. If present, mark unverified for future
        // (optional) magic-link verification.
        isEmailVerified: false,
      },
    });

    // An INDIVIDUAL carrier is a sole operator: the owner is also a driver, so
    // provision a driver profile now (they can then use the driver portal/app).
    // License details are seeded if provided, else placeholders to complete later.
    if (dto.companyType === 'CARRIER' && dto.accountType === 'INDIVIDUAL') {
      await this.prisma.driverProfile.create({
        data: {
          code: driverCode(),
          userId: user.id,
          companyId: company.id,
          licenseNumber: dto.licenseNumber ?? `IND-${user.id}`,
          licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : new Date(),
          licenseType: dto.licenseType ?? 'PENDING',
          ownership: 'OWNED',
          status: 'AVAILABLE',
        },
      });
    }

    // Send phone OTP automatically — this is the canonical verification path
    await this.otp.send(phone);

    // Welcome email (optional) — goes through the email connector (console in
    // dev, Resend in prod). Fire-and-forget: never block/fail registration on it.
    if (email) {
      void this.sendWelcomeEmail(email, dto.firstName);
    }

    await this.audit.record({
      userId: user.id,
      action: 'auth.register',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      metadata: {
        companyType: dto.companyType,
        hasEmail: !!email,
        legalConsent: { terms: true, privacy: true, transport: true },
      },
    });

    return {
      userId: user.id,
      verificationRequired: true,
      verificationChannel: 'sms',
      otpExpiresIn: 600,
    };
  }

  /** Transactional welcome email, sent via the email connector (gateway). */
  private async sendWelcomeEmail(to: string, firstName: string) {
    try {
      await this.email.send({
        to,
        subject: 'مرحبًا بك في نقلة',
        html:
          `<div dir="rtl" style="font-family:system-ui,Arial,sans-serif">` +
          `<h2>أهلًا ${firstName} 👋</h2>` +
          `<p>تم إنشاء حسابك في <strong>نقلة</strong> بنجاح. أكمل تفعيل رقم جوالك عبر رمز التحقق للبدء.</p>` +
          `</div>`,
        text: `أهلًا ${firstName}، تم إنشاء حسابك في نقلة بنجاح.`,
      });
    } catch (err) {
      this.logger.warn(`welcome email failed: ${(err as Error).message}`);
    }
  }

  // ─── Login (regular users — phone OR email + password) ──────────

  async login(dto: LoginDto, meta: { ip?: string; userAgent?: string } = {}) {
    const isEmail = dto.phoneOrEmail.includes('@');
    const identifierNormalized = isEmail
      ? dto.phoneOrEmail.toLowerCase()
      : normalizeSaudiPhone(dto.phoneOrEmail);

    // 1) Anti-bruteforce lockout
    const { blocked, resetInSeconds } = await this.attempts.isBlocked('user', identifierNormalized);
    if (blocked) {
      throw new ForbiddenException({
        code: 'LOGIN_LOCKED',
        message: `الحساب موقوف مؤقتاً بسبب محاولات فاشلة. حاول بعد ${Math.ceil(resetInSeconds / 60)} دقيقة.`,
        details: { retryAfter: resetInSeconds },
      });
    }

    const user = await this.prisma.user.findFirst({
      where: isEmail ? { email: identifierNormalized } : { phone: identifierNormalized },
    });

    const recordFailure = async () => {
      const out = await this.attempts.recordFailure('user', identifierNormalized);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'بيانات الدخول غير صحيحة',
        details: {
          remainingAttempts: out.remainingAttempts,
          locked: out.blocked,
          retryAfter: out.blocked ? out.resetInSeconds : undefined,
        },
      });
    };

    if (!user || !user.passwordHash) {
      await recordFailure();
    }
    const valid = await bcrypt.compare(dto.password, user!.passwordHash!);
    if (!valid) {
      await recordFailure();
    }
    if (!user!.isActive) {
      throw new UnauthorizedException({ code: 'ACCOUNT_INACTIVE', message: 'الحساب موقوف' });
    }
    if (user!.role === 'ADMIN' || user!.role === 'SUPER_ADMIN') {
      // Admins MUST use the dedicated admin endpoint to prevent leaking
      // admin auth via the public user lockout/UI.
      throw new ForbiddenException({
        code: 'USE_ADMIN_LOGIN',
        message: 'حساب الأدمن يستخدم نقطة الدخول الإدارية',
      });
    }

    await this.attempts.clear('user', identifierNormalized);
    await this.prisma.user.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } });

    await this.audit.record({
      userId: user!.id,
      action: 'auth.login',
      resourceType: 'User',
      resourceId: user!.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    return this.issueTokens(user!);
  }

  // ─── Refresh (rotation — old token invalidated) ─────────────────

  // A just-rotated refresh token may legitimately be presented again within a
  // few seconds by a second browser tab that refreshed in parallel (each tab
  // has its own in-memory refresh lock, but they share one stored token). That
  // benign race must NOT be treated as theft. Only reuse OUTSIDE this window
  // revokes the whole session.
  private static readonly ROTATION_GRACE_MS = 60_000;

  async refresh(refreshToken: string, meta: { ip?: string; userAgent?: string } = {}) {
    const record = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    const now = new Date();

    if (record?.isRevoked) {
      // Reuse of an already-rotated token. Inside the grace window it's a
      // benign client/tab race — reject just this request (the winning refresh
      // already minted a valid session). Outside it, treat as theft and revoke
      // every token for the user.
      const revokedAt = record.revokedAt?.getTime();
      const withinGrace =
        revokedAt != null && now.getTime() - revokedAt <= AuthService.ROTATION_GRACE_MS;
      if (!withinGrace && record.userId) {
        await this.blacklist.revokeAllForUser(record.userId);
        await this.audit.record({
          userId: record.userId,
          action: 'auth.refresh.replay_detected',
          resourceType: 'RefreshToken',
          resourceId: record.id,
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        });
      }
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'رمز التجديد غير صالح',
      });
    }

    if (!record || record.expiresAt < now) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'رمز التجديد غير صالح',
      });
    }
    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException({ code: 'ACCOUNT_INACTIVE', message: 'الحساب غير نشط' });
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { isRevoked: true, revokedAt: now },
    });
    return this.issueTokens(user, meta);
  }

  // ─── Logout (revokes the current access token + the refresh token) ─

  async logout(refreshToken: string, accessTokenJti?: string, accessTokenExp?: number, meta: { ip?: string; userAgent?: string; userId?: string } = {}) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    if (accessTokenJti && accessTokenExp) {
      await this.blacklist.revoke(accessTokenJti, accessTokenExp);
    }
    if (meta.userId) {
      await this.audit.record({
        userId: meta.userId,
        action: 'auth.logout',
        resourceType: 'User',
        resourceId: meta.userId,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
    }
    return { ok: true };
  }

  // ─── OTP (phone only — never email) ─────────────────────────────

  async sendOtp(phone: string) {
    const normalized = normalizeSaudiPhone(phone);
    return this.otp.send(normalized);
  }

  async verifyOtp(phone: string, code: string) {
    const normalized = normalizeSaudiPhone(phone);
    const ok = await this.otp.verify(normalized, code);
    if (!ok) {
      throw new BadRequestException({
        code: 'INVALID_OTP',
        message: 'رمز التحقق غير صحيح أو منتهي الصلاحية',
      });
    }
    await this.prisma.user.updateMany({
      where: { phone: normalized },
      data: { isPhoneVerified: true },
    });
    return { verified: true };
  }

  /// Passwordless login: verify a phone OTP and issue tokens. Mirrors `login`'s
  /// account checks (active, non-admin) but authenticates by OTP instead of a
  /// password.
  async loginWithOtp(
    phone: string,
    code: string,
    meta: { ip?: string; userAgent?: string } = {},
  ) {
    const normalized = normalizeSaudiPhone(phone);
    const ok = await this.otp.verify(normalized, code);
    if (!ok) {
      throw new BadRequestException({
        code: 'INVALID_OTP',
        message: 'رمز التحقق غير صحيح أو منتهي الصلاحية',
      });
    }
    const user = await this.prisma.user.findFirst({ where: { phone: normalized } });
    if (!user) {
      throw new UnauthorizedException({ code: 'USER_NOT_FOUND', message: 'لا يوجد حساب بهذا الرقم' });
    }
    if (!user.isActive) {
      throw new UnauthorizedException({ code: 'ACCOUNT_INACTIVE', message: 'الحساب موقوف' });
    }
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException({
        code: 'USE_ADMIN_LOGIN',
        message: 'حساب الأدمن يستخدم نقطة الدخول الإدارية',
      });
    }
    await this.prisma.user.updateMany({
      where: { phone: normalized },
      data: { isPhoneVerified: true },
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({
      userId: user.id,
      action: 'auth.login_otp',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return this.issueTokens(user);
  }

  // ─── Token issuance ─────────────────────────────────────────────

  private async issueTokens(
    user: {
      id: string; role: string; companyId: string | null;
      companyRole?: string | null;
      phone: string; email: string | null;
      firstName: string; lastName: string;
    },
    _meta: { ip?: string; userAgent?: string } = {},
  ) {
    const jti = randomUUID();
    // Prefer the documented env names (JWT_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN,
    // set in every .env template); keep the legacy *_TTL names as a fallback.
    const accessTTL = process.env.JWT_EXPIRES_IN ?? process.env.JWT_ACCESS_TTL ?? '10h';
    const refreshTTL = process.env.JWT_REFRESH_EXPIRES_IN ?? process.env.JWT_REFRESH_TTL ?? '7d';

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        role: user.role,
        companyId: user.companyId,
        companyRole: user.companyRole ?? null,
        phone: user.phone,
        email: user.email,
        jti,
      },
      { expiresIn: accessTTL },
    );

    const refreshToken = randomUUID() + '.' + randomUUID();
    const ttlDays = Number(refreshTTL.replace(/\D/g, '')) || 7;
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: parseDurationToSeconds(accessTTL),
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }
}

function parseDurationToSeconds(d: string): number {
  const m = d.match(/^(\d+)([smhd])$/);
  if (!m) return 900;
  const n = Number(m[1]);
  const unit = m[2];
  return unit === 's' ? n : unit === 'm' ? n * 60 : unit === 'h' ? n * 3600 : n * 86400;
}
