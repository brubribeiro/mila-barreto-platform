const STORAGE_KEY = 'mila.hideMoney';
const MASK = 'R$ ••••';

// Preferência global do botão "olho" do header. O Layout remonta a página ao alternar,
// então os formatadores leem o valor atual na próxima renderização.
let hidden = localStorage.getItem(STORAGE_KEY) === '1';

export function isMoneyHidden() {
  return hidden;
}

export function setMoneyHidden(value: boolean) {
  hidden = value;
  localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
}

/** Formatador BRL que respeita o modo "ocultar valores". */
export function moneyFormatter(options?: Intl.NumberFormatOptions) {
  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', ...options });
  return { format: (value: number | bigint) => (hidden ? MASK : fmt.format(value)) };
}

export const brl = moneyFormatter();
