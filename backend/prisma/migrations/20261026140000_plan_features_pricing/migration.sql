-- Preço e módulos no plano; overrides de módulos por clínica

ALTER TABLE "plans" ADD COLUMN "priceCents" INTEGER,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'BRL',
ADD COLUMN "features" JSONB;

ALTER TABLE "tenants" ADD COLUMN "featuresExtra" JSONB,
ADD COLUMN "featuresDenied" JSONB;
