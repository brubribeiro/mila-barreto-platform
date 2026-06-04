-- AlterTable: replace filePath with Google Drive fields
ALTER TABLE "documents" ADD COLUMN "driveFileId" TEXT;
ALTER TABLE "documents" ADD COLUMN "driveViewUrl" TEXT;

-- Migrate existing filePath data to driveViewUrl as fallback
UPDATE "documents" SET "driveViewUrl" = "filePath" WHERE "filePath" IS NOT NULL;

ALTER TABLE "documents" DROP COLUMN "filePath";
