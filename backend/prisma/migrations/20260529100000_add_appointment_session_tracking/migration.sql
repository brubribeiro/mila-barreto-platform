-- AlterEnum: add IN_PROGRESS to AppointmentStatus
ALTER TYPE "AppointmentStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable: add startedAt and finishedAt to appointments
ALTER TABLE "appointments" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "appointments" ADD COLUMN "finishedAt" TIMESTAMP(3);
