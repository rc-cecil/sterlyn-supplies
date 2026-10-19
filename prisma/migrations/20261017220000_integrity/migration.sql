ALTER TABLE "Variant" ADD CONSTRAINT "variant_stock_nonnegative" CHECK (stock >= 0);
ALTER TABLE "Variant" ADD CONSTRAINT "variant_price_nonnegative" CHECK (price IS NULL OR price >= 0);
ALTER TABLE "CartItem" ADD CONSTRAINT "cart_quantity_positive" CHECK (quantity > 0 AND quantity <= 100);
ALTER TABLE "Order" ADD CONSTRAINT "order_total_consistent" CHECK (total = subtotal - discount + tax + shipping AND total >= 0);
CREATE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit records are append-only'; END; $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
