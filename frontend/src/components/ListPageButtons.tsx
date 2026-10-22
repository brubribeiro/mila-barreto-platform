import { Box, IconButton, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ResponsiveStyleValue } from '@mui/system';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { fontSizes } from '../theme/fontSizes';
import { pageWindow } from '../utils/pagination';

/** Setas da paginação compacta (Financeiro, Estoque). */
export const COMPACT_PAGE_ARROW_SX = {
  width: 34,
  height: 34,
  border: 1,
  borderColor: 'divider',
  borderRadius: '9px',
} as const;

interface ListPageButtonsProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  /** Altura e largura mínima de cada botão (px). */
  size: number;
  radius: string;
  /** Padding horizontal dos números. */
  px: number;
  spacing: number;
  fontSize?: string;
  /** Reticências quando há muitas páginas (1 … 4 5 6 … 12). */
  windowed?: boolean;
  /** Mostra as setas anterior/próxima com este estilo. */
  arrowSx?: SxProps<Theme>;
  arrowSize?: 'small' | 'medium';
  /** Deixa os botões quebrarem linha, alinhados assim. */
  wrapJustify?: ResponsiveStyleValue<'center' | 'flex-end' | 'flex-start'>;
}

/** Botões numerados de paginação das listagens. */
export function ListPageButtons({
  page,
  pageCount,
  onChange,
  size,
  radius,
  px,
  spacing,
  fontSize = fontSizes.sm,
  windowed,
  arrowSx,
  arrowSize = 'small',
  wrapJustify,
}: ListPageButtonsProps) {
  const pages = windowed
    ? pageWindow(page, pageCount)
    : Array.from({ length: pageCount }, (_, i) => i);

  return (
    <Stack
      direction="row"
      spacing={spacing}
      alignItems="center"
      {...(wrapJustify && { flexWrap: 'wrap', useFlexGap: true, justifyContent: wrapJustify })}
    >
      {arrowSx && (
        <IconButton
          size={arrowSize}
          aria-label="Página anterior"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
          sx={arrowSx}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
      )}
      {pages.map((p, i) =>
        p == null ? (
          <Typography key={`gap-${i}`} sx={{ color: 'text.disabled', px: 0.25 }}>
            …
          </Typography>
        ) : (
          <Box
            key={p}
            component="button"
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            sx={{
              minWidth: size,
              height: size,
              px,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize,
              fontWeight: 700,
              borderRadius: radius,
              border: 1,
              borderColor: p === page ? 'primary.main' : 'divider',
              color: p === page ? '#fff' : 'text.secondary',
              bgcolor: p === page ? 'primary.main' : 'background.paper',
              '&:hover': { bgcolor: p === page ? 'primary.main' : 'grey.50' },
            }}
          >
            {p + 1}
          </Box>
        ),
      )}
      {arrowSx && (
        <IconButton
          size={arrowSize}
          aria-label="Próxima página"
          disabled={page >= pageCount - 1}
          onClick={() => onChange(page + 1)}
          sx={arrowSx}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
}
