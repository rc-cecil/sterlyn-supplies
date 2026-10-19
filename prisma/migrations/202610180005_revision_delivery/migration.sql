ALTER TABLE "Notification" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Notification_status_nextAttemptAt_idx" ON "Notification"("status","nextAttemptAt");
CREATE TABLE "CmsRevision" ("id" TEXT PRIMARY KEY, "pageId" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "actorId" TEXT NOT NULL, "status" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "CmsRevision_pageId_createdAt_idx" ON "CmsRevision"("pageId","createdAt");
ALTER TABLE "CmsRevision" ADD CONSTRAINT "CmsRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CmsPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
