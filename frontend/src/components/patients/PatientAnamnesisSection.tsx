import { Button, Stack } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import type { Patient } from '../../types';
import { usePermissions } from '../../contexts/usePermissions';
import { PatientSkinRoutinesCard } from '../skincare/PatientSkinRoutinesCard';
import { AnamnesisView, hasAnamnesisData } from './AnamnesisView';

/** Aba "Anamnese" da ficha completa e da gaveta: rotinas de skincare, botão de edição e respostas. */
export function PatientAnamnesisSection({
  patient,
  onEdit,
  buttonSize,
}: {
  patient: Patient;
  onEdit?: () => void;
  buttonSize?: 'small';
}) {
  const { has } = usePermissions();
  return (
    <Stack spacing={2}>
      {has('routines:view') && (
        <PatientSkinRoutinesCard
          patient={{ id: patient.id, name: patient.name, phone: patient.phone, email: patient.email }}
        />
      )}
      {onEdit && (
        <Stack direction="row" justifyContent="flex-end">
          <Button variant="contained" size={buttonSize} startIcon={<EditOutlinedIcon />} onClick={onEdit}>
            {hasAnamnesisData(patient.anamnesis) ? 'Editar anamnese' : 'Preencher anamnese'}
          </Button>
        </Stack>
      )}
      <AnamnesisView anamnesis={patient.anamnesis} />
    </Stack>
  );
}
