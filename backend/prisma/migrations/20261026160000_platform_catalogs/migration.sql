-- CreateTable
CREATE TABLE "platform_catalog_items" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_catalog_items_kind_active_sortOrder_idx" ON "platform_catalog_items"("kind", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "platform_catalog_items_kind_value_key" ON "platform_catalog_items"("kind", "value");
