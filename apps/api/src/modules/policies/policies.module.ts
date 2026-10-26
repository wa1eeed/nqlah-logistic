import { Module } from '@nestjs/common';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  controllers: [PoliciesController],
  providers: [PoliciesService, SubscriptionsService],
  exports: [PoliciesService, SubscriptionsService],
})
export class PoliciesModule {}
