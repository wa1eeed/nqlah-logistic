import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { AppSettingsService } from './app-settings.service';

@Module({
  controllers: [SettingsController],
  providers: [AppSettingsService],
})
export class SettingsModule {}
