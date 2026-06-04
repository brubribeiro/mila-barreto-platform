-- DropIndex
DROP INDEX IF EXISTS "financial_entries_appointmentId_key";

-- CreateIndex
CREATE INDEX "financial_entries_appointmentId_idx" ON "financial_entries"("appointmentId");
