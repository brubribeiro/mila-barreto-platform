import { Box, Button, Stack, Typography, alpha } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';

import { fontSizes } from '../../theme/fontSizes';

export function PatientListEmptyState({
  search,
  canCreate,
  onCreate,
}: {
  search: string;
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <Stack alignItems="center" spacing={1.5} sx={{ px: 3, py: 7, textAlign: 'center' }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
          color: 'primary.main',
        }}
      >
        <SearchIcon />
      </Box>
      <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 800 }}>
        {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
      </Typography>
      <Typography sx={{ fontSize: fontSizes.md, color: 'text.secondary', maxWidth: 380 }}>
        {search
          ? 'Não encontramos ninguém com esse nome, CPF ou telefone. Confira a grafia ou cadastre um novo paciente.'
          : 'Comece adicionando o primeiro paciente à sua base.'}
      </Typography>
      {canCreate && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreate}
          sx={{ mt: 0.5, borderRadius: '11px', boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
        >
          Adicionar paciente
        </Button>
      )}
    </Stack>
  );
}
