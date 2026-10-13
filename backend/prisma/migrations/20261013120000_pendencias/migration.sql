-- CreateEnum
CREATE TYPE "PendingRule" AS ENUM ('LOW_STOCK', 'EXPIRING_STOCK', 'BILLS_DUE', 'APPOINTMENT_NO_OUTCOME', 'EQUIPMENT_MAINTENANCE', 'DOCUMENT_UNSIGNED', 'COMMEMORATIVE_DATE');

-- CreateEnum
CREATE TYPE "PendingCategory" AS ENUM ('ADMINISTRATIVE', 'FINANCE', 'INVENTORY', 'OPERATIONAL', 'MAINTENANCE', 'HEALTH_SURVEILLANCE', 'MARKETING', 'TEAM', 'PATIENTS', 'MANAGEMENT');

-- CreateTable
CREATE TABLE "pending_tasks" (
    "id" TEXT NOT NULL,
    "rule" "PendingRule",
    "sourceKey" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "PendingCategory" NOT NULL,
    "dueDate" DATE,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "assigneeId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedByName" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_tasks_sourceKey_key" ON "pending_tasks"("sourceKey");

-- CreateIndex
CREATE INDEX "pending_tasks_resolvedAt_idx" ON "pending_tasks"("resolvedAt");

-- CreateIndex
CREATE INDEX "pending_tasks_assigneeId_idx" ON "pending_tasks"("assigneeId");

-- AddForeignKey
ALTER TABLE "pending_tasks" ADD CONSTRAINT "pending_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Permissões da Central de Pendências nos grupos padrão (o Administrador já tem todas)
UPDATE "roles"
SET "permissions" = array_cat("permissions", ARRAY['pendencias:view', 'pendencias:create', 'pendencias:edit']::TEXT[])
WHERE "name" = 'Recepção' AND "isSystem" = true AND NOT ('pendencias:view' = ANY("permissions"));

UPDATE "roles"
SET "permissions" = array_append("permissions", 'pendencias:view')
WHERE "name" = 'Profissional' AND "isSystem" = true AND NOT ('pendencias:view' = ANY("permissions"));
