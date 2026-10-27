import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [RealtimeModule, NotificationsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
