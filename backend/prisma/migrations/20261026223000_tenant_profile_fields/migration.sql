-- Perfil da clínica no control plane (super-admin).
ALTER TABLE "Tenant" ADD COLUMN "specialties" JSONB;
ALTER TABLE "Tenant" ADD COLUMN "foundedAt" DATE;
ALTER TABLE "Tenant" ADD COLUMN "legalName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "document" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "phone" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "email" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "city" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "state" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "notes" TEXT;
