-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "commemorativeDate" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_procedures" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,

    CONSTRAINT "promotion_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_packages" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,

    CONSTRAINT "promotion_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_name_key" ON "payment_methods"("name");

-- CreateIndex
CREATE INDEX "promotions_startAt_endAt_idx" ON "promotions"("startAt", "endAt");

-- CreateIndex
CREATE INDEX "promotions_active_idx" ON "promotions"("active");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_procedures_promotionId_procedureId_key" ON "promotion_procedures"("promotionId", "procedureId");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_packages_promotionId_packageId_key" ON "promotion_packages"("promotionId", "packageId");

-- AlterTable: financial_entries — substitui enum paymentMethod por FK + campos de taxa
ALTER TABLE "financial_entries" DROP COLUMN "paymentMethod";
ALTER TABLE "financial_entries" ADD COLUMN "netAmount" DECIMAL(10,2);
ALTER TABLE "financial_entries" ADD COLUMN "feePercent" DECIMAL(5,2);
ALTER TABLE "financial_entries" ADD COLUMN "paymentMethodId" TEXT;

-- AlterTable: patient_packages — enum → texto livre
ALTER TABLE "patient_packages" ALTER COLUMN "paymentMethod" TYPE TEXT USING "paymentMethod"::TEXT;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "promotionId" TEXT;

-- CreateIndex
CREATE INDEX "financial_entries_paymentMethodId_idx" ON "financial_entries"("paymentMethodId");

-- AddForeignKey
ALTER TABLE "promotion_procedures" ADD CONSTRAINT "promotion_procedures_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_procedures" ADD CONSTRAINT "promotion_procedures_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_packages" ADD CONSTRAINT "promotion_packages_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_packages" ADD CONSTRAINT "promotion_packages_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropEnum (não usado após remoção da coluna em financial_entries)
DROP TYPE "PaymentMethod";
