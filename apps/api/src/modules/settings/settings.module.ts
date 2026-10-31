import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { AppSettingsService } from './app-settings.service';
import { CurrenciesService } from './currencies.service';

@Module({
  controllers: [SettingsController],
  providers: [AppSettingsService, CurrenciesService],
})
export class SettingsModule {}
