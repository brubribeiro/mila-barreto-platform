import { Box, Skeleton, Stack } from '@mui/material';

/** Esqueleto da grade semanal enquanto os agendamentos carregam. */
export function AgendaCalendarSkeleton() {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        borderRadius: 'inherit',
        bgcolor: 'background.paper',
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Stack direction="row" spacing={1}>
        <Skeleton variant="rounded" width={54} height={30} sx={{ flexShrink: 0 }} />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={30} sx={{ flex: 1 }} />
        ))}
      </Stack>
      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '54px repeat(7, 1fr)',
          gridAutoRows: '1fr',
          gap: 1,
          minHeight: 0,
        }}
      >
        {Array.from({ length: 8 * 8 }).map((_, i) => {
          const isTimeCol = i % 8 === 0;
          const showEvent = !isTimeCol && (i * 7) % 5 < 2;
          return (
            <Box key={i} sx={{ display: 'flex', alignItems: 'stretch' }}>
              {isTimeCol ? (
                <Skeleton variant="text" width={34} sx={{ my: 'auto' }} />
              ) : showEvent ? (
                <Skeleton variant="rounded" sx={{ flex: 1, borderRadius: '10px' }} />
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
