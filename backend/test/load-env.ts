// Carrega backend/.env para os testes de integração (o PrismaClient de setup usa DATABASE_URL).
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });
