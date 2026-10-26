-- Per-leg intermediate stops: a stop can belong to a specific leg (رحلة فرعية)
-- of a heterogeneous consolidated order. Null legSequence = an order-level route
-- (single + homogeneous consolidated orders).
ALTER TABLE "OrderStop" ADD COLUMN "legSequence" INTEGER;

-- The route sequence is now unique per (order, leg) so each leg can restart at 1.
DROP INDEX IF EXISTS "OrderStop_orderId_sequence_key";
CREATE UNIQUE INDEX "OrderStop_orderId_legSequence_sequence_key"
  ON "OrderStop"("orderId", "legSequence", "sequence");
CREATE INDEX "OrderStop_orderId_legSequence_idx" ON "OrderStop"("orderId", "legSequence");
