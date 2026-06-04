-- CreateTable
CREATE TABLE "appointment_materials" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "appointment_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointment_materials_appointmentId_itemId_key" ON "appointment_materials"("appointmentId", "itemId");

-- AddForeignKey
ALTER TABLE "appointment_materials" ADD CONSTRAINT "appointment_materials_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_materials" ADD CONSTRAINT "appointment_materials_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
