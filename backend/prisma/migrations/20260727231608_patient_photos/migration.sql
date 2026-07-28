-- CreateEnum
CREATE TYPE "PatientPhotoPhase" AS ENUM ('BEFORE', 'AFTER');

-- CreateTable
CREATE TABLE "patient_photos" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "phase" "PatientPhotoPhase" NOT NULL,
    "label" TEXT,
    "pairId" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_photos_patientId_idx" ON "patient_photos"("patientId");

-- AddForeignKey
ALTER TABLE "patient_photos" ADD CONSTRAINT "patient_photos_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
