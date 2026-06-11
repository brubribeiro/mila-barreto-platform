import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Validar JWT_SECRET na inicialização
  const jwtSecret = config.get<string>('JWT_SECRET', '');
  if (
    !jwtSecret ||
    jwtSecret.length < 32 ||
    jwtSecret === 'troque-este-segredo-em-producao'
  ) {
    throw new Error(
      'JWT_SECRET inválido. Defina um segredo com pelo menos 32 caracteres no .env.',
    );
  }

  app.setGlobalPrefix('api');

  // Headers de segurança HTTP
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());

  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');

  app.enableCors({
    origin: corsOrigin.includes(',') ? corsOrigin.split(',') : corsOrigin,
    credentials: true,
  });

  const port = config.get<number>('PORT', 3333);
  await app.listen(port);
  console.log(`API rodando em http://localhost:${port}/api`);
}
bootstrap();
