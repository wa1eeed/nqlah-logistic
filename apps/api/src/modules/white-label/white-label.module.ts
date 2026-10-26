import { Module } from '@nestjs/common';
import { WhiteLabelController } from './white-label.controller';
import { WhiteLabelService } from './white-label.service';
import { PoliciesModule } from '../policies/policies.module';

@Module({
  imports: [PoliciesModule],
  controllers: [WhiteLabelController],
  providers: [WhiteLabelService],
})
export class WhiteLabelModule {}
