import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('orders/:orderId/messages')
export class ChatController {
  constructor(private chat: ChatService) {}

  @Get()
  list(@Param('orderId') orderId: string, @CurrentUser() actor: AuthUser) {
    return this.chat.list(orderId, actor);
  }

  @Post()
  @Audit({ action: 'chat.send', resourceType: 'Message', idFrom: 'response' })
  send(
    @Param('orderId') orderId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.chat.send(orderId, dto, actor);
  }
}
