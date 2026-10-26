import { UnauthorizedException } from '@nestjs/common';
import type { Tenant } from '@prisma/client';

/**
 * Recusa login/requisição de usuário cuja clínica está suspensa. 401 faz o frontend
 * encerrar a sessão; `error` permite à tela de login identificar o motivo.
 */
export function assertTenantActive(tenant: Pick<Tenant, 'name' | 'active'> | null | undefined) {
  if (tenant && !tenant.active) {
    throw new UnauthorizedException({
      statusCode: 401,
      error: 'TENANT_SUSPENDED',
      message: `O acesso da clínica ${tenant.name} está suspenso. Entre em contato com o suporte da plataforma.`,
    });
  }
}
