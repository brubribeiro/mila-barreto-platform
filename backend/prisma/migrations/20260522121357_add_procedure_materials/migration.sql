-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "materialsDeducted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "procedure_materials" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "procedure_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "procedure_materials_procedureId_itemId_key" ON "procedure_materials"("procedureId", "itemId");

-- AddForeignKey
ALTER TABLE "procedure_materials" ADD CONSTRAINT "procedure_materials_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_materials" ADD CONSTRAINT "procedure_materials_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
