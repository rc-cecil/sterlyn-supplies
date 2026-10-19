ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_orderId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "PrivacyRequest" ("id","userId","status","createdAt","updatedAt")
 SELECT 'legacy-' || t."id",u."id",'requested',t."createdAt",CURRENT_TIMESTAMP
 FROM "SupportTicket" t JOIN "user" u ON u."email"=t."email"
 WHERE t."subject"='Account deletion request' AND t."status" <> 'resolved'
 AND u."role"='customer' AND u."emailVerified"=true
 AND NOT EXISTS (SELECT 1 FROM "PrivacyRequest" p WHERE p."userId"=u."id");
ALTER TABLE "Notification" ALTER COLUMN "updatedAt" DROP DEFAULT;
