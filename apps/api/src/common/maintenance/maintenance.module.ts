import { Global, Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';

/** Exposes the maintenance flag reader app-wide (the guard + the settings
 *  controller depend on it). PrismaModule is already global. */
@Global()
@Module({
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
