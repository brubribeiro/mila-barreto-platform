import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { CatalogsService } from '../admin/catalogs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Leitura do catálogo da plataforma para o app da clínica.
 * Qualquer usuário autenticado; só itens ativos; todas as clínicas veem o mesmo.
 */
@UseGuards(JwtAuthGuard)
@Controller('catalogs')
export class CatalogsReadController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get()
  list(@Query('kind') kind?: string) {
    return this.catalogs.listActive(kind || undefined);
  }
}
