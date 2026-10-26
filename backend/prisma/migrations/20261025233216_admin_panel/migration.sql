-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastAccessAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "targetTenantId" TEXT,
    "targetName" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_audit_logs_targetTenantId_idx" ON "platform_audit_logs"("targetTenantId");

-- CreateIndex
CREATE INDEX "platform_audit_logs_createdAt_idx" ON "platform_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_targetTenantId_fkey" FOREIGN KEY ("targetTenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
