import { Global, Logger, Module } from '@nestjs/common';
import { MinioStorageConnector } from './minio-storage.connector';
import { R2StorageConnector } from './r2-storage.connector';
import { STORAGE_CONNECTOR } from './storage.connector';
import { IntegrationsService } from '../../modules/integrations/integrations.service';

/// Binds the active storage connector behind `STORAGE_CONNECTOR`, resolved once
/// at startup by the Integration Hub (DB → env → default). Supported providers:
/// `minio` (self-hosted, default) and `r2` (Cloudflare R2). Both are S3-based
/// and infra-level, so their credentials are read from env. Switching provider
/// requires a restart (this factory runs once).
@Global()
@Module({
  providers: [
    MinioStorageConnector,
    R2StorageConnector,
    {
      provide: STORAGE_CONNECTOR,
      useFactory: async (
        integrations: IntegrationsService,
        minio: MinioStorageConnector,
        r2: R2StorageConnector,
      ) => {
        const { provider } = await integrations.resolveActive('storage');
        switch (provider) {
          case 'r2':
            new Logger('Storage').log('Storage provider: Cloudflare R2.');
            return r2;
          case 'minio':
            return minio;
          default:
            new Logger('Storage').warn(
              `Storage provider "${provider}" not recognized — using MinIO.`,
            );
            return minio;
        }
      },
      inject: [IntegrationsService, MinioStorageConnector, R2StorageConnector],
    },
  ],
  exports: [STORAGE_CONNECTOR],
})
export class StorageModule {}
