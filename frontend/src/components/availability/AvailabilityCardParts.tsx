import { Skeleton, Stack, Typography } from '@mui/material';

import { fontSizes } from '../../theme/fontSizes';

export function CardTitle({ title }: { title: string }) {
  return (
    <Typography component="h3" sx={{ fontSize: fontSizes.xl, fontWeight: 700, lineHeight: 1.3 }}>
      {title}
    </Typography>
  );
}

export function CardListSkeleton() {
  return (
    <Stack spacing={1} sx={{ p: 2 }}>
      {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={48} />)}
    </Stack>
  );
}
