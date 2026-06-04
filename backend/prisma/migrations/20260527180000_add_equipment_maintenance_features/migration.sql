-- AlterEnum: add EQUIPMENT_MAINTENANCE to NotificationType
ALTER TYPE "NotificationType" ADD VALUE 'EQUIPMENT_MAINTENANCE';

-- AlterTable: add new columns to equipment
ALTER TABLE "equipment" ADD COLUMN "purchaseValue" DECIMAL(10,2),
ADD COLUMN "maintenanceValue" DECIMAL(10,2),
ADD COLUMN "maintenanceNotifyDaysBefore" INTEGER,
ADD COLUMN "scheduledMaintenanceAt" TIMESTAMP(3);

-- AlterTable: add equipmentId to financial_entries
ALTER TABLE "financial_entries" ADD COLUMN "equipmentId" TEXT;

-- CreateIndex
CREATE INDEX "financial_entries_equipmentId_idx" ON "financial_entries"("equipmentId");

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
