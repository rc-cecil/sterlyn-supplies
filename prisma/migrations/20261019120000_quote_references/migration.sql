CREATE SEQUENCE "quote_reference_seq" START WITH 1001;
ALTER TABLE "Quote" ADD COLUMN "reference" TEXT NOT NULL DEFAULT ('SQ-' || nextval('quote_reference_seq'));
CREATE UNIQUE INDEX "Quote_reference_key" ON "Quote"("reference");
