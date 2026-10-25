import { useEffect, useState, type ChangeEvent } from 'react';

import type { Patient } from '../../types';
import { validatePatientPhotoFile } from '../../utils/patientPhoto';

function revokeBlobPreview(url: string | null) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

/** Foto escolhida no formulário de paciente; só é enviada (ou removida) ao salvar. */
export function usePatientPhotoDraft(open: boolean, patient?: Patient | null) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPhotoFile(null);
      setPhotoRemoved(false);
      setPhotoError(null);
      setPhotoPreview(patient?.photoUrl ?? null);
    }
  }, [open, patient]);

  useEffect(
    () => () => {
      revokeBlobPreview(photoPreview);
    },
    [photoPreview],
  );

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = validatePatientPhotoFile(file);
    if (err) {
      setPhotoError(err);
      return;
    }
    setPhotoError(null);
    setPhotoRemoved(false);
    revokeBlobPreview(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoRemove = () => {
    revokeBlobPreview(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoRemoved(true);
    setPhotoError(null);
  };

  const avatarDisplaySrc = photoRemoved ? undefined : photoPreview ?? undefined;

  return { photoFile, photoRemoved, photoError, avatarDisplaySrc, handlePhotoSelect, handlePhotoRemove };
}
