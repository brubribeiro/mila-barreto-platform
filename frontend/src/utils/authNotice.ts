/**
 * Aviso exibido na tela de login depois que a sessão cai por um motivo que o usuário
 * precisa saber (hoje: clínica suspensa, erro TENANT_SUSPENDED da API).
 */
const NOTICE_KEY = 'auth_notice';

export const TENANT_SUSPENDED = 'TENANT_SUSPENDED';

const DEFAULT_SUSPENDED_MESSAGE =
  'O acesso da sua clínica está suspenso. Entre em contato com o suporte da plataforma.';

/** Mensagem da API quando a resposta é TENANT_SUSPENDED; null para qualquer outro erro. */
export function tenantSuspendedMessage(err: unknown): string | null {
  const data = (err as { response?: { data?: { error?: string; message?: unknown } } })?.response?.data;
  if (data?.error !== TENANT_SUSPENDED) return null;
  return typeof data.message === 'string' ? data.message : DEFAULT_SUSPENDED_MESSAGE;
}

export function saveAuthNotice(message: string) {
  sessionStorage.setItem(NOTICE_KEY, message);
}

export function readAuthNotice(): string | null {
  return sessionStorage.getItem(NOTICE_KEY);
}

/** O aviso aparece uma vez: a tela de login apaga depois de ler. */
export function clearAuthNotice() {
  sessionStorage.removeItem(NOTICE_KEY);
}
