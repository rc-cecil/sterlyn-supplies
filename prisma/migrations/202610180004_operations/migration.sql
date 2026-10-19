ALTER TABLE "user" ADD COLUMN "suspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "sourceQuoteId" TEXT, ADD COLUMN "quoteSnapshot" JSONB;
CREATE UNIQUE INDEX "Order_sourceQuoteId_key" ON "Order"("sourceQuoteId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_sourceQuoteId_fkey" FOREIGN KEY ("sourceQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "StaffInvitation" (
 "id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL, "role" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL, "invitedBy" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
 "acceptedAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "StaffInvitation_tokenHash_key" ON "StaffInvitation"("tokenHash");
CREATE INDEX "StaffInvitation_email_expiresAt_idx" ON "StaffInvitation"("email","expiresAt");
