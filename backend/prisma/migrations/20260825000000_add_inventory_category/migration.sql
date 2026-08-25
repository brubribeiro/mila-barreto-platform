-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('INSUMO', 'PRODUTO');

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN "category" "InventoryCategory";
