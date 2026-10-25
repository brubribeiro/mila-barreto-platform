import { Box } from '@mui/material';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';

import { fontSizes } from '../../theme/fontSizes';
import { GRID_COLS } from './patientListLayout';

export type PatientSortKey = 'lastVisit' | 'totalSpent' | 'appointments';
export type PatientSort = { key: PatientSortKey; dir: 'asc' | 'desc' } | null;

/** Cabeçalho de colunas da lista (desktop), com ordenação por visita, gasto e agendamentos. */
export function PatientListColumns({
  sort,
  onToggleSort: toggleSort,
}: {
  sort: PatientSort;
  onToggleSort: (key: PatientSortKey) => void;
}) {
  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'grid' },
        gridTemplateColumns: GRID_COLS,
        gap: 1.5,
        px: 2.75,
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'grey.50',
        fontSize: fontSizes['2xs'],
        fontWeight: 800,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      <span>Paciente</span>
      <span>CPF</span>
      <span>Telefone</span>
      {(['lastVisit', 'totalSpent', 'appointments'] as const).map((key) => {
        const active = sort?.key === key;
        const label =
          key === 'lastVisit' ? 'Última visita' : key === 'totalSpent' ? 'Total gasto' : 'Agend.';
        return (
          <Box
            key={key}
            component="button"
            type="button"
            onClick={() => toggleSort(key)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.4,
              p: 0,
              border: 0,
              bgcolor: 'transparent',
              cursor: 'pointer',
              font: 'inherit',
              letterSpacing: 'inherit',
              textTransform: 'inherit',
              color: active ? 'text.primary' : 'inherit',
              fontWeight: 800,
              '&:hover': { color: 'text.primary' },
            }}
          >
            {label}
            <ArrowUpwardRoundedIcon
              sx={{
                fontSize: 13,
                opacity: active ? 1 : 0.35,
                transform: active && sort?.dir === 'desc' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.12s',
              }}
            />
          </Box>
        );
      })}
      <span style={{ textAlign: 'right' }}>Score</span>
      <span />
    </Box>
  );
}
