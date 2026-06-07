import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { FinanceService } from './finance.service';
import { CreateFinancialEntryDto } from './dto/create-financial-entry.dto';
import { UpdateFinancialEntryDto } from './dto/update-financial-entry.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @RequirePermissions('finance:view')
  @Get()
  list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('pendingInvoice') pendingInvoice?: string,
    @Query('expenseType') expenseType?: string,
  ) {
    return this.finance.list(from, to, pendingInvoice === 'true', expenseType);
  }

  @RequirePermissions('finance:edit')
  @Patch(':id/invoice')
  setInvoiceIssued(@Param('id', ParseUUIDPipe) id: string, @Body() body: { issued: boolean }) {
    return this.finance.setInvoiceIssued(id, !!body.issued);
  }

  @RequirePermissions('finance:view')
  @Get('summary')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.finance.summary(from, to);
  }

  @RequirePermissions('finance:create')
  @Post()
  create(@Body() dto: CreateFinancialEntryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.finance.create(dto, user);
  }

  @RequirePermissions('finance:edit')
  @Patch(':id/paid')
  markPaid(@Param('id', ParseUUIDPipe) id: string, @Body() body: { paid: boolean }, @CurrentUser() user: AuthenticatedUser) {
    return this.finance.markPaid(id, !!body.paid, user);
  }

  @RequirePermissions('finance:edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFinancialEntryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.finance.update(id, dto, user);
  }

  @RequirePermissions('finance:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.finance.remove(id, user);
  }
}
