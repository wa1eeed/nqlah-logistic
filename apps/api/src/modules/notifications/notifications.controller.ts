import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { NotificationsService } from './notifications.service';

class RegisterDeviceDto {
  @IsString() token!: string;
  @IsOptional() @IsIn(['android', 'ios', 'web']) platform?: string;
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query() q: PaginationDto) {
    return this.notifications.list(userId, q);
  }

  /// Register this device's push token (FCM / APNs / web).
  @Post('devices')
  registerDevice(@CurrentUser('id') userId: string, @Body() dto: RegisterDeviceDto) {
    return this.notifications.registerDevice(userId, dto.token, dto.platform ?? 'android');
  }

  @Delete('devices/:token')
  unregisterDevice(@CurrentUser('id') userId: string, @Param('token') token: string) {
    return this.notifications.unregisterDevice(userId, token);
  }

  @Put('read-all')
  markAll(@CurrentUser('id') userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Put(':id/read')
  markOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notifications.markRead(userId, id);
  }
}
