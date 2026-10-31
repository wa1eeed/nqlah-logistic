import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Audit } from '../../common/audit/audit.decorator';
import { LocationsService } from './locations.service';
import {
  CreateCityDto, CreateCountryDto, CreateRegionDto,
  UpdateCityDto, UpdateCountryDto, UpdateRegionDto,
} from './dto/location.dto';

/**
 * Admin-only CRUD over the Country → Region → City geography. All routes are
 * guarded for ADMIN / SUPER_ADMIN. Deactivate a row by PATCHing `active:false`
 * (the public /settings/locations tree then hides it) or DELETE to remove it
 * and (cascade) its descendants.
 */
@ApiTags('locations')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/locations')
export class LocationsController {
  constructor(private locations: LocationsService) {}

  /** Full tree incl. inactive rows — the admin management UI reads this. */
  @Get()
  tree() {
    return this.locations.adminTree();
  }

  // ─── Countries ──────────────────────────────────────────────
  @Post('countries')
  @Audit({ action: 'admin.location.country.create', resourceType: 'Country' })
  createCountry(@Body() dto: CreateCountryDto) {
    return this.locations.createCountry(dto);
  }

  @Patch('countries/:id')
  @Audit({ action: 'admin.location.country.update', resourceType: 'Country', idFrom: 'param', idKey: 'id' })
  updateCountry(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.locations.updateCountry(id, dto);
  }

  @Delete('countries/:id')
  @Audit({ action: 'admin.location.country.delete', resourceType: 'Country', idFrom: 'param', idKey: 'id' })
  deleteCountry(@Param('id') id: string) {
    return this.locations.deleteCountry(id);
  }

  // ─── Regions ────────────────────────────────────────────────
  @Post('regions')
  @Audit({ action: 'admin.location.region.create', resourceType: 'Region' })
  createRegion(@Body() dto: CreateRegionDto) {
    return this.locations.createRegion(dto);
  }

  @Patch('regions/:id')
  @Audit({ action: 'admin.location.region.update', resourceType: 'Region', idFrom: 'param', idKey: 'id' })
  updateRegion(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.locations.updateRegion(id, dto);
  }

  @Delete('regions/:id')
  @Audit({ action: 'admin.location.region.delete', resourceType: 'Region', idFrom: 'param', idKey: 'id' })
  deleteRegion(@Param('id') id: string) {
    return this.locations.deleteRegion(id);
  }

  // ─── Cities ─────────────────────────────────────────────────
  @Post('cities')
  @Audit({ action: 'admin.location.city.create', resourceType: 'City' })
  createCity(@Body() dto: CreateCityDto) {
    return this.locations.createCity(dto);
  }

  @Patch('cities/:id')
  @Audit({ action: 'admin.location.city.update', resourceType: 'City', idFrom: 'param', idKey: 'id' })
  updateCity(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.locations.updateCity(id, dto);
  }

  @Delete('cities/:id')
  @Audit({ action: 'admin.location.city.delete', resourceType: 'City', idFrom: 'param', idKey: 'id' })
  deleteCity(@Param('id') id: string) {
    return this.locations.deleteCity(id);
  }
}
