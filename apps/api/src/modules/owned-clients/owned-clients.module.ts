import { Module } from '@nestjs/common';
import { OwnedClientsController } from './owned-clients.controller';
import { OwnedClientsService } from './owned-clients.service';
import { PoliciesModule } from '../policies/policies.module';

@Module({
  imports: [PoliciesModule],
  controllers: [OwnedClientsController],
  providers: [OwnedClientsService],
})
export class OwnedClientsModule {}
