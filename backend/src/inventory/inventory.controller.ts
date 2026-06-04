import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { BulkPurchaseDto } from './dto/bulk-purchase.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @RequirePermissions('inventory:view')
  @Get()
  list() {
    return this.inventory.list();
  }

  @RequirePermissions('inventory:view')
  @Get('low-stock')
  listLowStock() {
    return this.inventory.listLowStock();
  }

  @RequirePermissions('inventory:view')
  @Get(':id/deletion-preview')
  getDeletionPreview(@Param('id') id: string) {
    return this.inventory.getDeletionPreview(id);
  }

  @RequirePermissions('inventory:view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventory.findOne(id);
  }

  @RequirePermissions('inventory:create')
  @Post()
  create(@Body() dto: CreateInventoryItemDto) {
    return this.inventory.create(dto);
  }

  @RequirePermissions('inventory:edit')
  @Post('bulk-purchase')
  createBulkPurchase(@Body() dto: BulkPurchaseDto) {
    return this.inventory.createBulkPurchase(dto);
  }

  @RequirePermissions('inventory:edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.inventory.update(id, dto);
  }

  @RequirePermissions('inventory:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventory.remove(id);
  }

  // Movimentação manual conta como edição do item
  @RequirePermissions('inventory:edit')
  @Post(':id/movements')
  createMovement(@Param('id') id: string, @Body() dto: CreateMovementDto) {
    return this.inventory.createMovement(id, dto);
  }
}
