-- Multi-tenant (banco único, coluna tenantId).
-- 1. Cria a tabela de clínicas (tenants) e a clínica inicial "Mila Barreto".
-- 2. Adiciona tenantId em todas as tabelas de dados da clínica e move todos os
--    registros existentes para a clínica inicial (sem perda de dados).
-- 3. Unicidades que eram globais (nome de grupo, template, forma de pagamento,
--    SKU, sourceKey de pendência, chave de app_settings) passam a ser por clínica.
-- 4. users: tenantId nulo só para super-admin (isSuperAdmin), garantido por CHECK.
--
-- O DEFAULT current_setting('app.tenant_id', true) existe só para o Prisma Client
-- aceitar create sem tenantId (quem preenche é a extensão em src/tenancy). Se algo
-- inserir sem passar pela extensão, o default é NULL e o NOT NULL recusa o insert.

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- Mesma política das demais tabelas (20260623120000_enable_rls_all_tables)
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;

-- Clínica inicial: recebe todos os dados existentes
INSERT INTO "tenants" ("id", "name", "slug", "active", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'Mila Barreto', 'mila-barreto', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Backfill: adiciona tenantId, preenche com a clínica inicial e só então exige NOT NULL

ALTER TABLE "app_settings" ADD COLUMN "tenantId" TEXT;
UPDATE "app_settings" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "app_settings" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "appointment_materials" ADD COLUMN "tenantId" TEXT;
UPDATE "appointment_materials" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "appointment_materials" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "appointments" ADD COLUMN "tenantId" TEXT;
UPDATE "appointments" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "appointments" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "audit_logs" ADD COLUMN "tenantId" TEXT;
UPDATE "audit_logs" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "audit_logs" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "document_templates" ADD COLUMN "tenantId" TEXT;
UPDATE "document_templates" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "document_templates" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "documents" ADD COLUMN "tenantId" TEXT;
UPDATE "documents" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "documents" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "equipment" ADD COLUMN "tenantId" TEXT;
UPDATE "equipment" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "equipment" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "financial_entries" ADD COLUMN "tenantId" TEXT;
UPDATE "financial_entries" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "financial_entries" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "goals" ADD COLUMN "tenantId" TEXT;
UPDATE "goals" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "goals" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "inventory_items" ADD COLUMN "tenantId" TEXT;
UPDATE "inventory_items" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "inventory_items" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "inventory_movements" ADD COLUMN "tenantId" TEXT;
UPDATE "inventory_movements" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "inventory_movements" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "message_templates" ADD COLUMN "tenantId" TEXT;
UPDATE "message_templates" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "message_templates" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "notification_preferences" ADD COLUMN "tenantId" TEXT;
UPDATE "notification_preferences" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "notification_preferences" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "notifications" ADD COLUMN "tenantId" TEXT;
UPDATE "notifications" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "notifications" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "package_items" ADD COLUMN "tenantId" TEXT;
UPDATE "package_items" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "package_items" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "packages" ADD COLUMN "tenantId" TEXT;
UPDATE "packages" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "packages" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "patient_packages" ADD COLUMN "tenantId" TEXT;
UPDATE "patient_packages" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "patient_packages" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "patient_photos" ADD COLUMN "tenantId" TEXT;
UPDATE "patient_photos" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "patient_photos" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "patients" ADD COLUMN "tenantId" TEXT;
UPDATE "patients" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "patients" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "payment_methods" ADD COLUMN "tenantId" TEXT;
UPDATE "payment_methods" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "payment_methods" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "pending_tasks" ADD COLUMN "tenantId" TEXT;
UPDATE "pending_tasks" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "pending_tasks" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "procedure_equipment" ADD COLUMN "tenantId" TEXT;
UPDATE "procedure_equipment" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "procedure_equipment" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "procedure_materials" ADD COLUMN "tenantId" TEXT;
UPDATE "procedure_materials" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "procedure_materials" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "procedures" ADD COLUMN "tenantId" TEXT;
UPDATE "procedures" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "procedures" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "promotion_packages" ADD COLUMN "tenantId" TEXT;
UPDATE "promotion_packages" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "promotion_packages" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "promotion_procedures" ADD COLUMN "tenantId" TEXT;
UPDATE "promotion_procedures" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "promotion_procedures" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "promotions" ADD COLUMN "tenantId" TEXT;
UPDATE "promotions" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "promotions" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "recurring_expenses" ADD COLUMN "tenantId" TEXT;
UPDATE "recurring_expenses" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "recurring_expenses" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "roles" ADD COLUMN "tenantId" TEXT;
UPDATE "roles" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "roles" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "skincare_products" ADD COLUMN "tenantId" TEXT;
UPDATE "skincare_products" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "skincare_products" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "skincare_routines" ADD COLUMN "tenantId" TEXT;
UPDATE "skincare_routines" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "skincare_routines" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "skincare_rules" ADD COLUMN "tenantId" TEXT;
UPDATE "skincare_rules" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "skincare_rules" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "unavailabilities" ADD COLUMN "tenantId" TEXT;
UPDATE "unavailabilities" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "unavailabilities" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

ALTER TABLE "working_hours" ADD COLUMN "tenantId" TEXT;
UPDATE "working_hours" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "working_hours" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "tenantId" SET DEFAULT current_setting('app.tenant_id', true);

-- users: tenantId nulo só para super-admin; super-admin não tem grupo (role)
ALTER TABLE "users" ADD COLUMN "tenantId" TEXT,
ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "roleId" DROP NOT NULL;
UPDATE "users" SET "tenantId" = (SELECT "id" FROM "tenants" WHERE "slug" = 'mila-barreto');
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_or_super_admin_check" CHECK (
  ("isSuperAdmin" AND "tenantId" IS NULL)
  OR (NOT "isSuperAdmin" AND "tenantId" IS NOT NULL AND "roleId" IS NOT NULL)
);

-- app_settings: chave única por clínica
ALTER TABLE "app_settings" DROP CONSTRAINT "app_settings_pkey",
ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("tenantId", "key");

-- Unicidades globais viram por clínica

DROP INDEX "document_templates_name_key";
DROP INDEX "inventory_items_sku_key";
DROP INDEX "message_templates_name_key";
DROP INDEX "payment_methods_name_key";
DROP INDEX "pending_tasks_sourceKey_key";
DROP INDEX "roles_name_key";

CREATE UNIQUE INDEX "document_templates_tenantId_name_key" ON "document_templates"("tenantId", "name");
CREATE UNIQUE INDEX "inventory_items_tenantId_sku_key" ON "inventory_items"("tenantId", "sku");
CREATE UNIQUE INDEX "message_templates_tenantId_name_key" ON "message_templates"("tenantId", "name");
CREATE UNIQUE INDEX "payment_methods_tenantId_name_key" ON "payment_methods"("tenantId", "name");
CREATE UNIQUE INDEX "pending_tasks_tenantId_sourceKey_key" ON "pending_tasks"("tenantId", "sourceKey");
CREATE UNIQUE INDEX "roles_tenantId_name_key" ON "roles"("tenantId", "name");

-- Índices de tenantId
CREATE INDEX "appointment_materials_tenantId_idx" ON "appointment_materials"("tenantId");
CREATE INDEX "appointments_tenantId_idx" ON "appointments"("tenantId");
CREATE INDEX "audit_logs_tenantId_idx" ON "audit_logs"("tenantId");
CREATE INDEX "documents_tenantId_idx" ON "documents"("tenantId");
CREATE INDEX "equipment_tenantId_idx" ON "equipment"("tenantId");
CREATE INDEX "financial_entries_tenantId_idx" ON "financial_entries"("tenantId");
CREATE INDEX "goals_tenantId_idx" ON "goals"("tenantId");
CREATE INDEX "inventory_movements_tenantId_idx" ON "inventory_movements"("tenantId");
CREATE INDEX "notification_preferences_tenantId_idx" ON "notification_preferences"("tenantId");
CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");
CREATE INDEX "package_items_tenantId_idx" ON "package_items"("tenantId");
CREATE INDEX "packages_tenantId_idx" ON "packages"("tenantId");
CREATE INDEX "patient_packages_tenantId_idx" ON "patient_packages"("tenantId");
CREATE INDEX "patient_photos_tenantId_idx" ON "patient_photos"("tenantId");
CREATE INDEX "patients_tenantId_idx" ON "patients"("tenantId");
CREATE INDEX "procedure_equipment_tenantId_idx" ON "procedure_equipment"("tenantId");
CREATE INDEX "procedure_materials_tenantId_idx" ON "procedure_materials"("tenantId");
CREATE INDEX "procedures_tenantId_idx" ON "procedures"("tenantId");
CREATE INDEX "promotion_packages_tenantId_idx" ON "promotion_packages"("tenantId");
CREATE INDEX "promotion_procedures_tenantId_idx" ON "promotion_procedures"("tenantId");
CREATE INDEX "promotions_tenantId_idx" ON "promotions"("tenantId");
CREATE INDEX "recurring_expenses_tenantId_idx" ON "recurring_expenses"("tenantId");
CREATE INDEX "skincare_products_tenantId_idx" ON "skincare_products"("tenantId");
CREATE INDEX "skincare_routines_tenantId_idx" ON "skincare_routines"("tenantId");
CREATE INDEX "skincare_rules_tenantId_idx" ON "skincare_rules"("tenantId");
CREATE INDEX "unavailabilities_tenantId_idx" ON "unavailabilities"("tenantId");
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");
CREATE INDEX "working_hours_tenantId_idx" ON "working_hours"("tenantId");


-- Chaves estrangeiras para tenants
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "unavailabilities" ADD CONSTRAINT "unavailabilities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_photos" ADD CONSTRAINT "patient_photos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procedure_equipment" ADD CONSTRAINT "procedure_equipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procedure_materials" ADD CONSTRAINT "procedure_materials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "packages" ADD CONSTRAINT "packages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_packages" ADD CONSTRAINT "patient_packages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_procedures" ADD CONSTRAINT "promotion_procedures_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_packages" ADD CONSTRAINT "promotion_packages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointment_materials" ADD CONSTRAINT "appointment_materials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goals" ADD CONSTRAINT "goals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pending_tasks" ADD CONSTRAINT "pending_tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skincare_products" ADD CONSTRAINT "skincare_products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skincare_rules" ADD CONSTRAINT "skincare_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skincare_routines" ADD CONSTRAINT "skincare_routines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Mesma clínica nas referências: toda FK entre tabelas de clínica só aceita um registro
-- do mesmo tenantId (ex.: lançamento da clínica B com paciente da clínica A é recusado).
-- Feito com trigger porque o Prisma não modela FK composta (tenantId, id) sem mudar
-- todas as relações; o Prisma ignora triggers, então não gera drift.
CREATE OR REPLACE FUNCTION enforce_same_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  ref_id text := to_jsonb(NEW) ->> TG_ARGV[0];
  ref_tenant text;
  ref_exists boolean := false;
BEGIN
  IF ref_id IS NULL THEN
    RETURN NEW;
  END IF;
  EXECUTE format('SELECT "tenantId", true FROM %I WHERE "id" = $1', TG_ARGV[1])
    INTO ref_tenant, ref_exists USING ref_id;
  -- Registro inexistente fica para a FK normal acusar
  IF ref_exists AND ref_tenant IS DISTINCT FROM NEW."tenantId" THEN
    RAISE EXCEPTION 'Referência a registro de outra clínica (%.%)', TG_TABLE_NAME, TG_ARGV[0]
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "appointment_materials_appointmentId_same_tenant" BEFORE INSERT OR UPDATE OF "appointmentId", "tenantId" ON "appointment_materials"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('appointmentId', 'appointments');
CREATE TRIGGER "appointment_materials_itemId_same_tenant" BEFORE INSERT OR UPDATE OF "itemId", "tenantId" ON "appointment_materials"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('itemId', 'inventory_items');
CREATE TRIGGER "appointments_patientId_same_tenant" BEFORE INSERT OR UPDATE OF "patientId", "tenantId" ON "appointments"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('patientId', 'patients');
CREATE TRIGGER "appointments_patientPackageId_same_tenant" BEFORE INSERT OR UPDATE OF "patientPackageId", "tenantId" ON "appointments"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('patientPackageId', 'patient_packages');
CREATE TRIGGER "appointments_procedureId_same_tenant" BEFORE INSERT OR UPDATE OF "procedureId", "tenantId" ON "appointments"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('procedureId', 'procedures');
CREATE TRIGGER "appointments_professionalId_same_tenant" BEFORE INSERT OR UPDATE OF "professionalId", "tenantId" ON "appointments"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('professionalId', 'users');
CREATE TRIGGER "appointments_promotionId_same_tenant" BEFORE INSERT OR UPDATE OF "promotionId", "tenantId" ON "appointments"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('promotionId', 'promotions');
CREATE TRIGGER "documents_equipmentId_same_tenant" BEFORE INSERT OR UPDATE OF "equipmentId", "tenantId" ON "documents"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('equipmentId', 'equipment');
CREATE TRIGGER "documents_patientId_same_tenant" BEFORE INSERT OR UPDATE OF "patientId", "tenantId" ON "documents"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('patientId', 'patients');
CREATE TRIGGER "documents_templateId_same_tenant" BEFORE INSERT OR UPDATE OF "templateId", "tenantId" ON "documents"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('templateId', 'document_templates');
CREATE TRIGGER "financial_entries_appointmentId_same_tenant" BEFORE INSERT OR UPDATE OF "appointmentId", "tenantId" ON "financial_entries"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('appointmentId', 'appointments');
CREATE TRIGGER "financial_entries_equipmentId_same_tenant" BEFORE INSERT OR UPDATE OF "equipmentId", "tenantId" ON "financial_entries"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('equipmentId', 'equipment');
CREATE TRIGGER "financial_entries_patientId_same_tenant" BEFORE INSERT OR UPDATE OF "patientId", "tenantId" ON "financial_entries"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('patientId', 'patients');
CREATE TRIGGER "financial_entries_paymentMethodId_same_tenant" BEFORE INSERT OR UPDATE OF "paymentMethodId", "tenantId" ON "financial_entries"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('paymentMethodId', 'payment_methods');
CREATE TRIGGER "financial_entries_recurringExpenseId_same_tenant" BEFORE INSERT OR UPDATE OF "recurringExpenseId", "tenantId" ON "financial_entries"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('recurringExpenseId', 'recurring_expenses');
CREATE TRIGGER "inventory_movements_itemId_same_tenant" BEFORE INSERT OR UPDATE OF "itemId", "tenantId" ON "inventory_movements"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('itemId', 'inventory_items');
CREATE TRIGGER "message_templates_procedureId_same_tenant" BEFORE INSERT OR UPDATE OF "procedureId", "tenantId" ON "message_templates"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('procedureId', 'procedures');
CREATE TRIGGER "notification_preferences_userId_same_tenant" BEFORE INSERT OR UPDATE OF "userId", "tenantId" ON "notification_preferences"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('userId', 'users');
CREATE TRIGGER "notifications_userId_same_tenant" BEFORE INSERT OR UPDATE OF "userId", "tenantId" ON "notifications"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('userId', 'users');
CREATE TRIGGER "package_items_packageId_same_tenant" BEFORE INSERT OR UPDATE OF "packageId", "tenantId" ON "package_items"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('packageId', 'packages');
CREATE TRIGGER "package_items_procedureId_same_tenant" BEFORE INSERT OR UPDATE OF "procedureId", "tenantId" ON "package_items"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('procedureId', 'procedures');
CREATE TRIGGER "patient_packages_packageId_same_tenant" BEFORE INSERT OR UPDATE OF "packageId", "tenantId" ON "patient_packages"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('packageId', 'packages');
CREATE TRIGGER "patient_packages_patientId_same_tenant" BEFORE INSERT OR UPDATE OF "patientId", "tenantId" ON "patient_packages"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('patientId', 'patients');
CREATE TRIGGER "patient_photos_appointmentId_same_tenant" BEFORE INSERT OR UPDATE OF "appointmentId", "tenantId" ON "patient_photos"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('appointmentId', 'appointments');
CREATE TRIGGER "patient_photos_patientId_same_tenant" BEFORE INSERT OR UPDATE OF "patientId", "tenantId" ON "patient_photos"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('patientId', 'patients');
CREATE TRIGGER "pending_tasks_assigneeId_same_tenant" BEFORE INSERT OR UPDATE OF "assigneeId", "tenantId" ON "pending_tasks"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('assigneeId', 'users');
CREATE TRIGGER "procedure_equipment_equipmentId_same_tenant" BEFORE INSERT OR UPDATE OF "equipmentId", "tenantId" ON "procedure_equipment"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('equipmentId', 'equipment');
CREATE TRIGGER "procedure_equipment_procedureId_same_tenant" BEFORE INSERT OR UPDATE OF "procedureId", "tenantId" ON "procedure_equipment"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('procedureId', 'procedures');
CREATE TRIGGER "procedure_materials_itemId_same_tenant" BEFORE INSERT OR UPDATE OF "itemId", "tenantId" ON "procedure_materials"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('itemId', 'inventory_items');
CREATE TRIGGER "procedure_materials_procedureId_same_tenant" BEFORE INSERT OR UPDATE OF "procedureId", "tenantId" ON "procedure_materials"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('procedureId', 'procedures');
CREATE TRIGGER "promotion_packages_packageId_same_tenant" BEFORE INSERT OR UPDATE OF "packageId", "tenantId" ON "promotion_packages"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('packageId', 'packages');
CREATE TRIGGER "promotion_packages_promotionId_same_tenant" BEFORE INSERT OR UPDATE OF "promotionId", "tenantId" ON "promotion_packages"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('promotionId', 'promotions');
CREATE TRIGGER "promotion_procedures_procedureId_same_tenant" BEFORE INSERT OR UPDATE OF "procedureId", "tenantId" ON "promotion_procedures"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('procedureId', 'procedures');
CREATE TRIGGER "promotion_procedures_promotionId_same_tenant" BEFORE INSERT OR UPDATE OF "promotionId", "tenantId" ON "promotion_procedures"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('promotionId', 'promotions');
CREATE TRIGGER "skincare_routines_patientId_same_tenant" BEFORE INSERT OR UPDATE OF "patientId", "tenantId" ON "skincare_routines"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('patientId', 'patients');
CREATE TRIGGER "unavailabilities_userId_same_tenant" BEFORE INSERT OR UPDATE OF "userId", "tenantId" ON "unavailabilities"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('userId', 'users');
CREATE TRIGGER "users_roleId_same_tenant" BEFORE INSERT OR UPDATE OF "roleId", "tenantId" ON "users"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('roleId', 'roles');
CREATE TRIGGER "working_hours_userId_same_tenant" BEFORE INSERT OR UPDATE OF "userId", "tenantId" ON "working_hours"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant('userId', 'users');
