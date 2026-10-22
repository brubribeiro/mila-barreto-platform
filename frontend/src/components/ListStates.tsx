import type { ReactNode } from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { fontSizes } from '../theme/fontSizes';

interface ListEmptyStateProps {
  icon: SvgIconComponent;
  title: ReactNode;
  description: ReactNode;
  /** Espaçamento do bloco (cada listagem usa o seu). */
  sx?: SystemStyleObject<Theme>;
  /** Ação opcional abaixo do texto. */
  children?: ReactNode;
}

/** Estado vazio das listagens: ícone, título e dica. */
export function ListEmptyState({ icon: Icon, title, description, sx, children }: ListEmptyStateProps) {
  return (
    <Box sx={{ ...sx, textAlign: 'center' }}>
      <Icon sx={{ fontSize: 46, color: 'text.disabled', mb: 1 }} />
      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      <Typography color="text.secondary" sx={{ fontSize: fontSizes.md, mt: 0.5 }}>
        {description}
      </Typography>
      {children}
    </Box>
  );
}

interface ListSkeletonRowsProps {
  count?: number;
  height: number;
  px: number | string;
  py: number;
  variant?: 'text' | 'rounded';
}

/** Linhas de carregamento das listagens em tabela. */
export function ListSkeletonRows({ count = 6, height, px, py, variant }: ListSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} sx={{ px, py, borderBottom: 1, borderColor: 'grey.100' }}>
          <Skeleton variant={variant} height={height} />
        </Box>
      ))}
    </>
  );
}
