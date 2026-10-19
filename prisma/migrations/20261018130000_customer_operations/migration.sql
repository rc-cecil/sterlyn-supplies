CREATE TABLE "Invoice" ("id" TEXT NOT NULL PRIMARY KEY,"orderId" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'draft',"number" TEXT,"snapshot" JSONB NOT NULL,"actorId" TEXT NOT NULL,"issuedAt" TIMESTAMP(3),"voidedAt" TIMESTAMP(3),"voidReason" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT;
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_orderId_status_idx" ON "Invoice"("orderId","status");
CREATE TABLE "InvoiceCounter" ("year" INTEGER NOT NULL PRIMARY KEY,"value" INTEGER NOT NULL DEFAULT 0);
CREATE TABLE "PrivacyRequest" ("id" TEXT NOT NULL PRIMARY KEY,"userId" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'requested',"reason" TEXT,"reviewedBy" TEXT,"completedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "PrivacyRequest_userId_status_idx" ON "PrivacyRequest"("userId","status");
CREATE TABLE "PublicationSchedule" ("id" TEXT NOT NULL PRIMARY KEY,"target" TEXT NOT NULL,"targetId" TEXT NOT NULL,"placement" TEXT,"publishAt" TIMESTAMP(3) NOT NULL,"actorId" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'scheduled',"error" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "PublicationSchedule_status_publishAt_idx" ON "PublicationSchedule"("status","publishAt");
