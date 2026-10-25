import { ReactNode } from 'react';
import { IconButton, InputBase, Stack, Tooltip } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import { fontSizes } from '../theme/fontSizes';

export const LIST_HEADER_CONTROL_HEIGHT = 38;
const CONTROL_RADIUS = '12px';
const COMPACT_RADIUS = '11px';

type HeaderBreakpoint = 'md' | 'lg' | 'xl';

interface ListCardHeaderProps {
  /** Lado esquerdo: título, contagem ou abas de categoria. */
  title: ReactNode;
  /** Lado direito: filtros, busca e ações. */
  children: ReactNode;
  /** A partir deste breakpoint título e controles ficam lado a lado. */
  breakpoint?: HeaderBreakpoint;
  /** A partir deste breakpoint os controles não quebram linha; `null` = sempre podem quebrar. */
  nowrapFrom?: HeaderBreakpoint | null;
  sx?: SystemStyleObject<Theme>;
}

/** Cabeçalho padrão do card de listagem: filtros ficam dentro do card, acima da tabela, com divisor. */
export function ListCardHeader({
  title,
  children,
  breakpoint = 'md',
  nowrapFrom = 'lg',
  sx,
}: ListCardHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', [breakpoint]: 'row' }}
      alignItems={{ xs: 'stretch', [breakpoint]: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{ px: { xs: 2, sm: 2.75 }, py: 2, borderBottom: 1, borderColor: 'divider', ...sx }}
    >
      {title}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        flexWrap={nowrapFrom ? { xs: 'wrap', [nowrapFrom]: 'nowrap' } : 'wrap'}
        useFlexGap
        justifyContent={{ [breakpoint]: 'flex-end' }}
        sx={{ minWidth: 0 }}
      >
        {children}
      </Stack>
    </Stack>
  );
}

interface ListSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Largura a partir de `sm` (no celular ocupa a linha toda). */
  width?: number;
  /** Rótulo acessível; padrão é o placeholder. */
  ariaLabel?: string;
  /** Versão mais justa (raio 11px), usada no Financeiro e no Estoque. */
  compact?: boolean;
}

export function ListSearchField({
  value,
  onChange,
  placeholder,
  width = 230,
  ariaLabel = placeholder,
  compact,
}: ListSearchFieldProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={compact ? 1.1 : 1}
      sx={{
        height: LIST_HEADER_CONTROL_HEIGHT,
        px: compact ? 1.6 : 1.75,
        borderRadius: compact ? COMPACT_RADIUS : CONTROL_RADIUS,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'grey.50',
        width: { xs: '100%', sm: width },
        ...(!compact && { minWidth: 0 }),
      }}
    >
      <SearchIcon sx={{ fontSize: compact ? 17 : 18, color: 'text.disabled' }} />
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputProps={{ 'aria-label': ariaLabel }}
        sx={{ fontSize: fontSizes.sm, flex: 1, ...(compact && { minWidth: 0 }) }}
      />
    </Stack>
  );
}

export function ListHistoryButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip title="Histórico de alterações">
      <IconButton
        onClick={onClick}
        sx={{
          flexShrink: 0,
          width: LIST_HEADER_CONTROL_HEIGHT,
          height: LIST_HEADER_CONTROL_HEIGHT,
          borderRadius: CONTROL_RADIUS,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'grey.50',
          color: 'text.secondary',
        }}
      >
        <HistoryIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

/** Select de filtro no cabeçalho de listagem (mesmo visual da busca). */
export const LIST_HEADER_SELECT_SX = {
  width: { xs: 'calc(50% - 5px)', sm: 168 },
  flexShrink: 0,
  '& .MuiOutlinedInput-root': {
    height: LIST_HEADER_CONTROL_HEIGHT,
    borderRadius: CONTROL_RADIUS,
    bgcolor: 'grey.50',
    fontSize: fontSizes.sm,
    fontWeight: 600,
    color: 'text.secondary',
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
} as const;

/** Select com fundo branco e largura pelo conteúdo (Equipamentos, Despesas recorrentes). */
export const LIST_HEADER_PAPER_SELECT_SX = {
  flexShrink: 0,
  width: { xs: 'calc(50% - 5px)', sm: 'auto' },
  minWidth: { sm: 150 },
  '& .MuiOutlinedInput-root': {
    height: LIST_HEADER_CONTROL_HEIGHT,
    borderRadius: CONTROL_RADIUS,
    fontSize: fontSizes.sm,
    bgcolor: 'background.paper',
  },
} as const;

/** `Select` simples da versão compacta (Financeiro, Estoque). */
export const LIST_HEADER_COMPACT_SELECT_SX = {
  height: LIST_HEADER_CONTROL_HEIGHT,
  minWidth: 150,
  borderRadius: COMPACT_RADIUS,
  bgcolor: 'grey.50',
  fontSize: fontSizes.sm,
  fontWeight: 600,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
} as const;

/** Botão só com ícone (exportar, modelos...) no cabeçalho de listagem. */
export const LIST_HEADER_ICON_BUTTON_SX = {
  flexShrink: 0,
  width: LIST_HEADER_CONTROL_HEIGHT,
  height: LIST_HEADER_CONTROL_HEIGHT,
  borderRadius: CONTROL_RADIUS,
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.secondary',
} as const;

/** Botão primário do cabeçalho de listagem. */
export const LIST_HEADER_ACTION_SX = {
  flexShrink: 0,
  whiteSpace: 'nowrap',
  height: LIST_HEADER_CONTROL_HEIGHT,
  px: 2.25,
  borderRadius: CONTROL_RADIUS,
} as const;

/** Botão primário com a sombra colorida das telas Aurora. */
export const LIST_HEADER_PRIMARY_ACTION_SX = {
  ...LIST_HEADER_ACTION_SX,
  boxShadow: (t: Theme) => `0 6px 16px -6px ${t.palette.primary.main}`,
} as const;
