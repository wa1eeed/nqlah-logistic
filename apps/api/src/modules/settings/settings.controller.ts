import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get('catalogs')
  async catalogs() {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: ['catalog.cities', 'catalog.cargo_types', 'catalog.truck_types'] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      cities:     map['catalog.cities']      ? JSON.parse(map['catalog.cities'])      : null,
      cargoTypes: map['catalog.cargo_types'] ? JSON.parse(map['catalog.cargo_types']) : null,
      truckTypes: map['catalog.truck_types'] ? JSON.parse(map['catalog.truck_types']) : null,
    };
  }
}
