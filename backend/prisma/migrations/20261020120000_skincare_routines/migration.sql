-- CreateTable
CREATE TABLE "skincare_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "activeIngredient" TEXT,
    "moments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "step" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "howTo" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skincare_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skincare_rules" (
    "id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avoidTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skincare_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skincare_routines" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consultDate" DATE NOT NULL,
    "answers" JSONB NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "avoided" JSONB NOT NULL DEFAULT '[]',
    "guidelines" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skincare_routines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skincare_routines_patientId_consultDate_idx" ON "skincare_routines"("patientId", "consultDate");

-- AddForeignKey
ALTER TABLE "skincare_routines" ADD CONSTRAINT "skincare_routines_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Permissões de Rotinas de skincare nos grupos padrão (o Administrador já tem todas)
UPDATE "roles"
SET "permissions" = array_cat("permissions", ARRAY['routines:view', 'routines:create', 'routines:edit']::TEXT[])
WHERE "name" = 'Profissional' AND "isSystem" = true AND NOT ('routines:view' = ANY("permissions"));

UPDATE "roles"
SET "permissions" = array_append("permissions", 'routines:view')
WHERE "name" = 'Recepção' AND "isSystem" = true AND NOT ('routines:view' = ANY("permissions"));
