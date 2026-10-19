ALTER TABLE "VideoJob" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "leaseToken" TEXT, ADD COLUMN "leaseUntil" TIMESTAMP(3), ADD COLUMN "heartbeatAt" TIMESTAMP(3);
CREATE INDEX "VideoJob_kind_status_leaseUntil_idx" ON "VideoJob"("kind","status","leaseUntil");
CREATE TABLE "UploadIntent" (
 "id" TEXT NOT NULL PRIMARY KEY, "actorId" TEXT NOT NULL, "key" TEXT NOT NULL,
 "mime" TEXT NOT NULL, "name" TEXT NOT NULL, "alt" TEXT NOT NULL, "size" INTEGER NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "assetId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "UploadIntent_key_key" ON "UploadIntent"("key");
CREATE UNIQUE INDEX "UploadIntent_assetId_key" ON "UploadIntent"("assetId");
CREATE INDEX "UploadIntent_expiresAt_assetId_idx" ON "UploadIntent"("expiresAt","assetId");
