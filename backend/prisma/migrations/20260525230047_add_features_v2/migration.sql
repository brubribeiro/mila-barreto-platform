-- CreateEnum
CREATE TYPE "AppointmentKind" AS ENUM ('EVALUATION', 'PROCEDURE', 'RETURN');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "clinicalNotes" TEXT,
ADD COLUMN     "financeGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "AppointmentKind" NOT NULL DEFAULT 'PROCEDURE';

-- AlterTable
ALTER TABLE "financial_entries" ADD COLUMN     "invoiceIssued" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invoiceIssuedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "procedures" ADD COLUMN     "recurrenceDays" INTEGER;

-- CreateTable
CREATE TABLE "working_hours" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unavailabilities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unavailabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "working_hours_userId_dayOfWeek_key" ON "working_hours"("userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "unavailabilities_userId_startAt_endAt_idx" ON "unavailabilities"("userId", "startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_name_key" ON "message_templates"("name");

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unavailabilities" ADD CONSTRAINT "unavailabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
