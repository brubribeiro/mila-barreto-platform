import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { fontSizes } from '../theme/fontSizes';

interface ListTableHeaderProps {
  /** `grid-template-columns`, o mesmo das linhas. */
  columns: string;
  children: ReactNode;
  /** Espaçamento e ajustes de cada tabela. */
  sx?: SystemStyleObject<Theme>;
}

/** Cabeçalho de colunas (texto pequeno em caixa alta) das tabelas em grid. */
export function ListTableHeader({ columns, children, sx }: ListTableHeaderProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: columns,
        gap: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'grey.50',
        fontSize: fontSizes['2xs'],
        fontWeight: 700,
        color: 'text.disabled',
        letterSpacing: '0.4px',
        textTransform: 'uppercase',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
