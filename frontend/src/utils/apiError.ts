type ValidationItem = {
  constraints?: Record<string, string>;
  property?: string;
};

function formatValidationItem(item: unknown): string | null {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return null;
  const entry = item as ValidationItem;
  if (entry.constraints) {
    return Object.values(entry.constraints).join(', ');
  }
  if (entry.property) return entry.property;
  return null;
}

/** Extract a readable message from axios/API errors. */
export function getApiErrorMessage(err: unknown, fallback = 'Erro inesperado'): string {
  if (!err || typeof err !== 'object') return fallback;

  const axiosErr = err as {
    response?: { data?: { message?: unknown } };
    message?: string;
  };

  const dataMsg = axiosErr.response?.data?.message;

  if (typeof dataMsg === 'string' && dataMsg.trim()) return dataMsg;

  if (Array.isArray(dataMsg)) {
    const parts = dataMsg.map(formatValidationItem).filter(Boolean) as string[];
    if (parts.length > 0) return parts.join(' · ');
  }

  if (axiosErr.message && !axiosErr.response) return axiosErr.message;

  return fallback;
}
