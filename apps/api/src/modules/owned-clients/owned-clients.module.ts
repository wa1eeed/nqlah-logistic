import { Module } from '@nestjs/common';
import { OwnedClientsController } from './owned-clients.controller';
import { OwnedClientsService } from './owned-clients.service';

@Module({
  controllers: [OwnedClientsController],
  providers: [OwnedClientsService],
})
export class OwnedClientsModule {}
