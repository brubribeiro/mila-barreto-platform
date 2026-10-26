-- AlterTable
ALTER TABLE "roles" ADD COLUMN "color" TEXT;

-- Cores padrão dos grupos do sistema
UPDATE "roles" SET "color" = '#15998B' WHERE "name" = 'Administrador';
UPDATE "roles" SET "color" = '#9B7BD4' WHERE "name" = 'Profissional';
UPDATE "roles" SET "color" = '#E0915B' WHERE "name" = 'Recepção';
