-- AlterTable
ALTER TABLE "procedures" ADD COLUMN     "applicationMap" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "procedure_equipment" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "costPerUse" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "procedure_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "procedure_equipment_procedureId_idx" ON "procedure_equipment"("procedureId");

-- CreateIndex
CREATE INDEX "procedure_equipment_equipmentId_idx" ON "procedure_equipment"("equipmentId");

-- AddForeignKey
ALTER TABLE "procedure_equipment" ADD CONSTRAINT "procedure_equipment_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_equipment" ADD CONSTRAINT "procedure_equipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
