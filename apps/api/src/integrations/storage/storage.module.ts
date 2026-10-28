import { Global, Logger, Module } from '@nestjs/common';
import { MinioStorageConnector } from './minio-storage.connector';
import { STORAGE_CONNECTOR } from './storage.connector';
import { IntegrationsService } from '../../modules/integrations/integrations.service';

/// Binds the active storage connector behind `STORAGE_CONNECTOR`, resolved by
/// the Integration Hub (DB → env → default). A Cloudflare R2 connector drops in
/// here; until then non-minio providers fall back to MinIO. MinIO credentials
/// are infra-level and read from env.
@Global()
@Module({
  providers: [
    MinioStorageConnector,
    {
      provide: STORAGE_CONNECTOR,
      useFactory: async (
        integrations: IntegrationsService,
        minio: MinioStorageConnector,
      ) => {
        const { provider } = await integrations.resolveActive('storage');
        if (provider !== 'minio') {
          new Logger('Storage').warn(`Storage provider "${provider}" not wired yet — using MinIO.`);
        }
        return minio;
      },
      inject: [IntegrationsService, MinioStorageConnector],
    },
  ],
  exports: [STORAGE_CONNECTOR],
})
export class StorageModule {}
