import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { fontSizes } from '../../theme/fontSizes';

export function PatientListPagination({
  pageCount,
  currentPage,
  rangeStart,
  rangeEnd,
  total,
  setPage,
}: {
  pageCount: number;
  currentPage: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  setPage: Dispatch<SetStateAction<number>>;
}) {
  // Páginas visíveis com reticências: primeira, última, atual e vizinhas
  const pageItems = useMemo<(number | 'dots')[]>(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
    const items = new Set<number>([
      0,
      pageCount - 1,
      currentPage,
      Math.max(0, currentPage - 1),
      Math.min(pageCount - 1, currentPage + 1),
    ]);
    const sorted = Array.from(items).sort((a, b) => a - b);
    const result: (number | 'dots')[] = [];
    let prev = -1;
    for (const n of sorted) {
      if (prev !== -1 && n - prev > 1) result.push('dots');
      result.push(n);
      prev = n;
    }
    return result;
  }, [pageCount, currentPage]);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      flexWrap="wrap"
      spacing={1.5}
      sx={{ px: 2.75, py: 1.75, borderTop: 1, borderColor: 'divider' }}
    >
      <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
        {rangeStart}–{rangeEnd} de {total}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <IconButton
          size="small"
          aria-label="Página anterior"
          disabled={currentPage === 0}
          onClick={() => setPage((v) => Math.max(0, v - 1))}
          sx={{ border: 1, borderColor: 'divider', borderRadius: '9px' }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        {pageItems.map((item, idx) =>
          item === 'dots' ? (
            <Box
              key={`dots-${idx}`}
              sx={{
                minWidth: 24,
                textAlign: 'center',
                color: 'text.disabled',
                fontSize: fontSizes.xs,
                fontWeight: 700,
              }}
            >
              …
            </Box>
          ) : (
            <Box
              key={item}
              component="button"
              type="button"
              aria-label={`Página ${item + 1}`}
              aria-current={item === currentPage ? 'page' : undefined}
              onClick={() => setPage(item)}
              sx={{
                minWidth: 30,
                height: 30,
                px: 0.5,
                borderRadius: '9px',
                border: 1,
                borderColor: item === currentPage ? 'primary.main' : 'divider',
                bgcolor: item === currentPage ? 'primary.main' : 'background.paper',
                color: item === currentPage ? '#fff' : 'text.secondary',
                fontSize: fontSizes.xs,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {item + 1}
            </Box>
          ),
        )}
        <IconButton
          size="small"
          aria-label="Próxima página"
          disabled={currentPage >= pageCount - 1}
          onClick={() => setPage((v) => Math.min(pageCount - 1, v + 1))}
          sx={{ border: 1, borderColor: 'divider', borderRadius: '9px' }}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
}
