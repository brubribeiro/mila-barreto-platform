-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'SUGGESTION');

-- CreateTable (tenantId desde o início: feature ainda não estava na release)
CREATE TABLE "feedback_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
    "type" "FeedbackType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pageUrl" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_reports_userId_idx" ON "feedback_reports"("userId");

-- CreateIndex
CREATE INDEX "feedback_reports_createdAt_idx" ON "feedback_reports"("createdAt");

-- CreateIndex
CREATE INDEX "feedback_reports_type_idx" ON "feedback_reports"("type");

-- CreateIndex
CREATE INDEX "feedback_reports_tenantId_idx" ON "feedback_reports"("tenantId");

-- AddForeignKey
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mesma clínica: o autor do report deve pertencer ao tenant do registro
CREATE TRIGGER "feedback_reports_userId_same_tenant" BEFORE INSERT OR UPDATE OF "userId", "tenantId" ON "feedback_reports"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('userId', 'users');

ALTER TABLE "feedback_reports" ENABLE ROW LEVEL SECURITY;
