-- AlterTable
ALTER TABLE "message_templates" ADD COLUMN "procedureId" TEXT;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
