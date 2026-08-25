-- Perfil de profissional (colunas nullable na tabela users)
ALTER TABLE "users" ADD COLUMN "specialty" TEXT;
ALTER TABLE "users" ADD COLUMN "councilRegister" TEXT;
ALTER TABLE "users" ADD COLUMN "calendarColor" TEXT;
ALTER TABLE "users" ADD COLUMN "bio" TEXT;
ALTER TABLE "users" ADD COLUMN "photoStorageKey" TEXT;
ALTER TABLE "users" ADD COLUMN "photoUrl" TEXT;
