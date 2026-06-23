-- Habilita Row-Level Security em todas as tabelas.
-- Como não criamos policies, o acesso via anon/authenticated key do Supabase
-- fica totalmente bloqueado. O backend (Prisma) usa o role postgres/service_role
-- que ignora RLS, então continua funcionando normalmente.

ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "working_hours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unavailabilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "equipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "procedures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "procedure_materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "packages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "package_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_packages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotion_procedures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotion_packages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment_materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_methods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurring_expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
