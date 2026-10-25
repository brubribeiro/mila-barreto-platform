import type { KeyboardEvent } from 'react';

/**
 * Torna um elemento não interativo (linha, card) clicável também pelo teclado:
 * foco por Tab e ativação com Enter/Espaço. Ignora teclas vindas de botões filhos.
 */
export function clickableProps(onActivate: () => void, label?: string) {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
