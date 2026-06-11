import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = 'Registro duplicado.';
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Referência inválida: um dos registros relacionados não existe.';
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Registro não encontrado.';
        break;
    }

    response.status(status).json({ statusCode: status, message });
  }
}
