export const PATIENT_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PATIENT_PHOTO_MAX_MB = 5;

export function patientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function validatePatientPhotoFile(file: File): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return 'Use uma imagem JPEG, PNG ou WebP.';
  }
  if (file.size > PATIENT_PHOTO_MAX_MB * 1024 * 1024) {
    return `A foto deve ter no máximo ${PATIENT_PHOTO_MAX_MB} MB.`;
  }
  return null;
}
