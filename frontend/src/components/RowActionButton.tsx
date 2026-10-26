import type { MouseEvent, ReactNode } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

export const ROW_ACTION_BUTTON_SX = {
  width: 30,
  height: 30,
  borderRadius: '9px',
  border: 1,
  borderColor: 'divider',
  color: 'text.secondary',
} as const;

interface RowActionButtonProps {
  title: string;
  onClick: (ev: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  /** Botão de exclusão: ícone em vermelho. */
  danger?: boolean;
  ariaLabel?: string;
  sx?: SystemStyleObject<Theme>;
}

/** Botão de ação quadrado com borda (editar, excluir...) nas linhas e cards de listagem. */
export function RowActionButton({ title, onClick, children, danger, ariaLabel, sx }: RowActionButtonProps) {
  return (
    <Tooltip title={title}>
      <IconButton
        aria-label={ariaLabel}
        onClick={onClick}
        sx={{ ...ROW_ACTION_BUTTON_SX, ...(danger && { color: 'error.main' }), ...sx }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}
