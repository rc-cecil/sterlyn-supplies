-- Additive showroom migration: no historical rows are deleted or reset.
CREATE SEQUENCE "order_reference_seq";
CREATE TABLE "Customer" (
 "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL UNIQUE,
 "phone" TEXT, "userId" TEXT UNIQUE, "verifiedBy" TEXT NOT NULL,
 "notes" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "Quote" ADD COLUMN "requestKey" TEXT UNIQUE, ADD COLUMN "requestHash" TEXT,
 ADD COLUMN "customerId" TEXT REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Quote" ALTER COLUMN "reference" SET DEFAULT ('SQ-' || lpad(nextval('quote_reference_seq')::text, greatest(6, length(currval('quote_reference_seq')::text)), '0'));
ALTER TABLE "Order" ADD COLUMN "reference" TEXT UNIQUE, ADD COLUMN "customerId" TEXT REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD COLUMN "phone" TEXT, ADD COLUMN "assignedTo" TEXT, ADD COLUMN "expectedDelivery" TIMESTAMP(3),
 ADD COLUMN "resumeStatus" TEXT, ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN "trackingHash" TEXT UNIQUE, ADD COLUMN "trackingCipher" TEXT,
 ADD COLUMN "trackingRevokedAt" TIMESTAMP(3), ADD COLUMN "trackingExpiresAt" TIMESTAMP(3);
ALTER TABLE "Order" ALTER COLUMN "reference" SET DEFAULT ('SSL-' || lpad(nextval('order_reference_seq')::text, greatest(6, length(currval('order_reference_seq')::text)), '0'));
ALTER TABLE "OrderItem" ALTER COLUMN "variantId" DROP NOT NULL, ALTER COLUMN "price" DROP NOT NULL,
 ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'product', ADD COLUMN "snapshot" JSONB;
ALTER TABLE "Payment" ALTER COLUMN "provider" SET DEFAULT 'manual';
ALTER TABLE "Payment" ADD COLUMN "currency" TEXT, ADD COLUMN "confirmedBy" TEXT,
 ADD COLUMN "confirmedAt" TIMESTAMP(3), ADD COLUMN "externalReference" TEXT, ADD COLUMN "method" TEXT,
 ADD COLUMN "reversalOf" TEXT UNIQUE REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD COLUMN "reason" TEXT, ADD COLUMN "requestKey" TEXT UNIQUE;
ALTER TABLE "OrderEvent" ADD COLUMN "previousStatus" TEXT, ADD COLUMN "publicNote" TEXT;
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");
CREATE TABLE "EnquiryEvent" (
 "id" TEXT PRIMARY KEY, "quoteId" TEXT NOT NULL REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "previousStatus" TEXT, "status" TEXT NOT NULL, "actorId" TEXT NOT NULL,
 "note" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EnquiryEvent_quoteId_createdAt_idx" ON "EnquiryEvent"("quoteId", "createdAt");
ALTER TABLE "Notification" ADD COLUMN "html" TEXT, ADD COLUMN "dedupeKey" TEXT UNIQUE,
 ADD COLUMN "templateData" JSONB, ADD COLUMN "leaseToken" TEXT, ADD COLUMN "leaseUntil" TIMESTAMP(3);
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
