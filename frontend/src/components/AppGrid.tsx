import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { ReactNode } from 'react';

type ColumnCount = number | string;

export type AppGridColumns = {
  xs?: ColumnCount;
  sm?: ColumnCount;
  md?: ColumnCount;
  lg?: ColumnCount;
};

function repeatColumns(count: ColumnCount) {
  return typeof count === 'number' ? `repeat(${count}, minmax(0, 1fr))` : count;
}

interface AppGridProps {
  children: ReactNode;
  columns?: AppGridColumns;
  gap?: number | { xs?: number; sm?: number; md?: number };
  sx?: SxProps<Theme>;
}

/** Grade com gap uniforme — sem margem negativa do Grid legado do MUI */
export function AppGrid({ children, columns = { xs: 1 }, gap = 2, sx }: AppGridProps) {
  const { xs = 1, sm, md, lg } = columns;

  return (
    <Box
      sx={{
        display: 'grid',
        alignItems: 'stretch',
        gap,
        width: '100%',
        gridTemplateColumns: {
          xs: repeatColumns(xs),
          ...(sm != null && { sm: repeatColumns(sm) }),
          ...(md != null && { md: repeatColumns(md) }),
          ...(lg != null && { lg: repeatColumns(lg) }),
        },
        '& > *': { minWidth: 0, display: 'flex', flexDirection: 'column', width: '100%' },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
