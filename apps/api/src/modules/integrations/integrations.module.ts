import { Global, Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsHealthService } from './integrations-health.service';
import { IntegrationsController } from './integrations.controller';

/// Integration Hub — the control plane for all external integrations.
/// `@Global` so every connector factory can inject `IntegrationsService` to
/// resolve its active provider + config at runtime (DB → env → default).
/// `STORAGE_CONNECTOR` (used by the health service) is already global.
@Global()
@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationsHealthService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
