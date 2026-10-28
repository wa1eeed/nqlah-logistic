import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';

/// The signed-in user's chat inbox (الرسائل): one entry per order they're a
/// party to that has messages.
@ApiTags('chat')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private chat: ChatService) {}

  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.chat.conversations(actor);
  }
}
