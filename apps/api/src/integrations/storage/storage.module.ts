import { Global, Module } from '@nestjs/common';
import { MinioStorageConnector } from './minio-storage.connector';
import { STORAGE_CONNECTOR } from './storage.connector';

/// Binds the active storage connector behind `STORAGE_CONNECTOR`. Swap the
/// provider via `STORAGE_PROVIDER` (default `minio`; `r2` once that connector
/// lands) without touching any app code. Global so any module can inject it.
@Global()
@Module({
  providers: [
    MinioStorageConnector,
    {
      provide: STORAGE_CONNECTOR,
      useFactory: (minio: MinioStorageConnector) => {
        switch (process.env.STORAGE_PROVIDER ?? 'minio') {
          // case 'r2': return new R2StorageConnector();  // future drop-in
          case 'minio':
          default:
            return minio;
        }
      },
      inject: [MinioStorageConnector],
    },
  ],
  exports: [STORAGE_CONNECTOR],
})
export class StorageModule {}
