-- Gatilho de envio e status ativo nos modelos de mensagem
CREATE TYPE "MessageTrigger" AS ENUM ('ON_BOOKING', 'DAY_BEFORE', 'BIRTHDAY', 'AFTER_APPOINTMENT', 'INACTIVE_90_DAYS', 'MANUAL');

ALTER TABLE "message_templates"
  ADD COLUMN "trigger" "MessageTrigger" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- Modelos existentes herdam o gatilho da categoria
UPDATE "message_templates" SET "trigger" = CASE "category"
  WHEN 'confirmacao' THEN 'ON_BOOKING'::"MessageTrigger"
  WHEN 'lembrete' THEN 'DAY_BEFORE'::"MessageTrigger"
  WHEN 'aniversario' THEN 'BIRTHDAY'::"MessageTrigger"
  WHEN 'retorno' THEN 'INACTIVE_90_DAYS'::"MessageTrigger"
  ELSE 'MANUAL'::"MessageTrigger"
END;
