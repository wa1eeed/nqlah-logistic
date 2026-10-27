import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const KINDS = ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE'] as const;

export class SendMessageDto {
  @IsOptional() @IsIn(KINDS) kind?: (typeof KINDS)[number];

  /// Required for TEXT; optional caption for media.
  @ValidateIf((o) => (o.kind ?? 'TEXT') === 'TEXT')
  @IsString()
  @MaxLength(2000)
  body?: string;

  /// Object-store key returned by `POST /uploads/presign` (for media kinds).
  @ValidateIf((o) => o.kind && o.kind !== 'TEXT')
  @IsString()
  mediaKey?: string;

  @IsOptional() @IsString() @MaxLength(200) mediaName?: string;
  @IsOptional() @IsString() @MaxLength(120) mediaMime?: string;
  @IsOptional() @IsInt() @Min(0) mediaSize?: number;
  @IsOptional() @IsInt() @Min(0) durationMs?: number;
}
