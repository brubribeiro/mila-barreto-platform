import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import {
  MessagesService,
  CreateMessageTemplateDto,
  UpdateMessageTemplateDto,
} from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  // Todos com permissão de ver agendamentos podem ler templates (usado em modais de envio)
  @RequirePermissions('messages:view')
  @Get()
  list() {
    return this.messages.list();
  }

  @RequirePermissions('messages:view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.messages.findOne(id);
  }

  @RequirePermissions('messages:create')
  @Post()
  create(@Body() dto: CreateMessageTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.messages.create(dto, user);
  }

  @RequirePermissions('messages:edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMessageTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.messages.update(id, dto, user);
  }

  @RequirePermissions('messages:delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.messages.remove(id, user);
  }
}
