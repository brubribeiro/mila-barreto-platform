import { Card, CardContent, Stack, Typography } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

interface ComingSoonProps {
  description?: string;
}

export function ComingSoon({ description }: ComingSoonProps) {
  return (
    <Card sx={{ borderStyle: 'dashed', borderWidth: 1, borderColor: 'divider', bgcolor: 'transparent' }} variant="outlined">
      <CardContent sx={{ py: 6 }}>
        <Stack alignItems="center" spacing={2}>
          <ConstructionIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
          <Typography variant="h6" color="text.secondary">
            Em construção
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={500}>
              {description}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
