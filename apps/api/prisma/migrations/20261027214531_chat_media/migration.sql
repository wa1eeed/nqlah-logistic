-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "mediaKey" TEXT,
ADD COLUMN     "mediaMime" TEXT,
ADD COLUMN     "mediaName" TEXT,
ADD COLUMN     "mediaSize" INTEGER,
ALTER COLUMN "body" SET DEFAULT '';
