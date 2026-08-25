-- Áreas de atuação do profissional (lista de tags)
ALTER TABLE "users" ADD COLUMN "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
