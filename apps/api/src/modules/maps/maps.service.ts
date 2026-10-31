import { Injectable } from '@nestjs/common';
import { IntegrationsService } from '../integrations/integrations.service';

const OSM_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '© OpenStreetMap contributors';

export interface MapsClientConfig {
  provider: string;
  /** XYZ raster tile template consumed by the client renderers (flutter_map /
   *  leaflet). Always present (falls back to free OSM). */
  tileUrl: string;
  attribution: string;
  /** Present only for the Google provider (its own SDK, not raster tiles). */
  googleApiKey?: string;
  maxZoom: number;
}

/**
 * Resolves the client-facing maps configuration from the Integration Hub
 * (`maps` domain). This is intentionally safe to serve to unauthenticated
 * clients: MapLibre/OSM needs no key, and Mapbox/Google client keys are meant
 * to be public (restricted by referrer / bundle id).
 */
@Injectable()
export class MapsService {
  constructor(private integrations: IntegrationsService) {}

  async clientConfig(): Promise<MapsClientConfig> {
    const { provider, config } = await this.integrations.resolveActive('maps');

    if (provider === 'mapbox') {
      const token = (config.MAPBOX_TOKEN || '').trim();
      const style = (config.MAPBOX_STYLE || 'mapbox/streets-v12').trim();
      return {
        provider: 'mapbox',
        tileUrl: token
          ? `https://api.mapbox.com/styles/v1/${style}/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`
          : OSM_TILE,
        attribution: token ? '© Mapbox © OpenStreetMap' : OSM_ATTR,
        maxZoom: 19,
      };
    }

    if (provider === 'google') {
      // Google tiles can't be used via raw XYZ (ToS) — clients use the Google
      // SDK with this key. Raster fallback keeps the map usable meanwhile.
      return {
        provider: 'google',
        tileUrl: OSM_TILE,
        attribution: OSM_ATTR,
        googleApiKey: (config.GOOGLE_MAPS_API_KEY || '').trim() || undefined,
        maxZoom: 19,
      };
    }

    // maplibre / default — free OSM raster.
    return {
      provider: 'maplibre',
      tileUrl: (config.MAPS_TILE_URL || '').trim() || OSM_TILE,
      attribution: (config.MAPS_ATTRIBUTION || '').trim() || OSM_ATTR,
      maxZoom: 19,
    };
  }
}
