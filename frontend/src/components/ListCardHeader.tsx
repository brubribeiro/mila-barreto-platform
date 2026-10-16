import { ReactNode } from 'react';
import { IconButton, InputBase, Stack, Tooltip } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import { fontSizes } from '../theme/fontSizes';

export const LIST_HEADER_CONTROL_HEIGHT = 38;
const CONTROL_RADIUS = '12px';

interface ListCardHeaderProps {
  /** Lado esquerdo: título, contagem ou abas de categoria. */
  title: ReactNode;
  /** Lado direito: filtros, busca e ações. */
  children: ReactNode;
}

/** Cabeçalho padrão do card de listagem: filtros ficam dentro do card, acima da tabela, com divisor. */
export function ListCardHeader({ title, children }: ListCardHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'stretch', md: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{ px: { xs: 2, sm: 2.75 }, py: 2, borderBottom: 1, borderColor: 'divider' }}
    >
      {title}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        flexWrap={{ xs: 'wrap', lg: 'nowrap' }}
        useFlexGap
        justifyContent={{ md: 'flex-end' }}
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
}

export function ListSearchField({ value, onChange, placeholder }: ListSearchFieldProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        height: LIST_HEADER_CONTROL_HEIGHT,
        px: 1.75,
        borderRadius: CONTROL_RADIUS,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'grey.50',
        width: { xs: '100%', sm: 230 },
        minWidth: 0,
      }}
    >
      <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputProps={{ 'aria-label': placeholder }}
        sx={{ fontSize: fontSizes.sm, flex: 1 }}
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

/** Botão primário do cabeçalho de listagem. */
export const LIST_HEADER_ACTION_SX = {
  flexShrink: 0,
  whiteSpace: 'nowrap',
  height: LIST_HEADER_CONTROL_HEIGHT,
  px: 2.25,
  borderRadius: CONTROL_RADIUS,
} as const;
