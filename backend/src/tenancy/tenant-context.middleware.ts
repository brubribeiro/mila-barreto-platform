import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { TenantContext } from './tenant-context';

/** Abre o contexto de tenant da requisição; o JwtAuthGuard define a clínica após autenticar. */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction) {
    TenantContext.runRequest(() => next());
  }
}
