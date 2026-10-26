-- CreateEnum
CREATE TYPE "GoalMetric" AS ENUM ('REVENUE', 'NEW_PATIENTS', 'PROCEDURES', 'AVERAGE_TICKET', 'OCCUPANCY', 'RETURN_RATE', 'MANUAL');

-- CreateEnum
CREATE TYPE "GoalFormat" AS ENUM ('CURRENCY', 'NUMBER', 'PERCENT');

-- CreateEnum
CREATE TYPE "GoalPeriodType" AS ENUM ('MONTH', 'QUARTER', 'YEAR');

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metric" "GoalMetric" NOT NULL DEFAULT 'MANUAL',
    "format" "GoalFormat" NOT NULL DEFAULT 'NUMBER',
    "target" DECIMAL(12,2) NOT NULL,
    "manualValue" DECIMAL(12,2),
    "periodType" "GoalPeriodType" NOT NULL DEFAULT 'MONTH',
    "periodStart" DATE NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#15998B',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_periodStart_idx" ON "goals"("periodStart");

