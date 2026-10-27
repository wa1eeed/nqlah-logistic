import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Audit } from '../../common/audit/audit.decorator';
import { UploadsService } from './uploads.service';

/// Uploads are direct client → object store via a pre-signed PUT URL (no bytes
/// pass through our server). Accepts images, short video/audio clips, PDFs and
/// common documents. 25 MB cap (short clips / voice notes are small).
const CHAT_MEDIA_MAX_BYTES = 25 * 1024 * 1024;
const DOC_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];
function isAllowedMime(mime: string): boolean {
  return (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    DOC_MIMES.includes(mime)
  );
}

class PresignDto {
  @IsString() filename!: string;
  @IsString() contentType!: string;
  @IsOptional() @IsString() folder?: string;
  @IsOptional() @IsInt() @Min(1) @Max(CHAT_MEDIA_MAX_BYTES) sizeBytes?: number;
}

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  /**
   * Returns a pre-signed PUT URL plus the object key. The client uploads the
   * bytes straight to the store, then stores `key` on the target resource
   * (e.g. a chat message). 30 presigns/minute/IP.
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Audit({ action: 'upload.presign', resourceType: 'Upload' })
  @Post('presign')
  presign(@Body() dto: PresignDto) {
    if (!isAllowedMime(dto.contentType)) {
      throw new BadRequestException({
        code: 'FILE_TYPE_DISALLOWED',
        message: 'نوع الملف غير مسموح',
      });
    }
    if (dto.sizeBytes != null && dto.sizeBytes > CHAT_MEDIA_MAX_BYTES) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `حجم الملف يتجاوز الحد الأقصى ${CHAT_MEDIA_MAX_BYTES / 1024 / 1024} MB`,
      });
    }
    return this.uploads.presignedUpload(
      dto.filename,
      dto.contentType,
      dto.folder ?? 'general',
      dto.sizeBytes,
    );
  }
}
