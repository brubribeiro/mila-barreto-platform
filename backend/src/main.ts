import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
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

  // Fail-fast: sem GOOGLE_CLIENT_ID a lib pode omitir checagem de audience no ID token
  const googleClientId = (config.get<string>('GOOGLE_CLIENT_ID') ?? '').trim();
  if (!googleClientId || googleClientId.length < 20) {
    throw new Error(
      'GOOGLE_CLIENT_ID inválido ou ausente. Defina o Client ID OAuth do Google no .env (obrigatório para validar a audience do ID token).',
    );
  }

  app.setGlobalPrefix('api');

  // Headers de segurança HTTP
  app.use(helmet());
  app.use(cookieParser());

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
