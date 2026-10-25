/**
 * Cria um super-admin da plataforma (sem clínica, sem grupo). Login via Google com o e-mail.
 * Uso: npm run prisma:create-super-admin -- --email voce@exemplo.com --name "Seu Nome"
 * (ou SUPER_ADMIN_EMAIL / SUPER_ADMIN_NAME no ambiente)
 */
import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Client sem escopo de clínica: super-admin não pertence a nenhuma.
const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = (arg('email') ?? process.env.SUPER_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const name = (arg('name') ?? process.env.SUPER_ADMIN_NAME ?? 'Super-admin').trim();
  if (!email || !email.includes('@')) {
    throw new Error('Informe o e-mail: npm run prisma:create-super-admin -- --email voce@exemplo.com --name "Seu Nome"');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.isSuperAdmin) {
    console.log(`• Super-admin já existe: ${email}`);
    return;
  }
  if (existing) {
    throw new Error(`O e-mail ${email} já pertence a um usuário de clínica. Use outro e-mail para o super-admin.`);
  }

  // Login é via Google; a senha só preenche o campo obrigatório.
  const password = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
  await prisma.user.create({
    data: { name, email, password, isSuperAdmin: true, tenantId: null, roleId: null, providesAppointments: false },
  });
  console.log(`✓ Super-admin criado: ${email}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
