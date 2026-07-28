-- Vincula fotos antes/depois ao agendamento correspondente.

-- Remove registros antigos sem vínculo (schema anterior não tinha appointmentId).
DELETE FROM "patient_photos";

ALTER TABLE "patient_photos" ADD COLUMN "appointmentId" TEXT NOT NULL;

CREATE INDEX "patient_photos_appointmentId_idx" ON "patient_photos"("appointmentId");

ALTER TABLE "patient_photos" ADD CONSTRAINT "patient_photos_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
