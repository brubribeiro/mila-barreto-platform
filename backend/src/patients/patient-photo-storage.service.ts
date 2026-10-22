import { BadRequestException, Injectable } from '@nestjs/common';

import { R2StorageService } from '../documents/r2-storage.service';
import { CompressionService } from '../documents/compression.service';

const PATIENT_PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PATIENT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PATIENT_PHOTO_URL_TTL_SECONDS = 3600;

type WithPhoto = { photoStorageKey?: string | null; photoUrl?: string | null };

/** Fotos de pacientes no R2: validação, upload, remoção e URLs assinadas. */
@Injectable()
export class PatientPhotoStorageService {
  constructor(
    private readonly r2: R2StorageService,
    private readonly compression: CompressionService,
  ) {}

  get isConfigured() {
    return this.r2.isConfigured;
  }

  /** URL temporária assinada; lança se o R2 falhar. */
  getSignedUrl(key: string) {
    return this.r2.getPresignedUrl(key, PATIENT_PHOTO_URL_TTL_SECONDS);
  }

  /** URL temporária assinada, ou null se o R2 falhar. */
  signOrNull(key: string): Promise<string | null> {
    return this.getSignedUrl(key).catch(() => null);
  }

  async withAccessUrl<T extends WithPhoto>(patient: T): Promise<T> {
    if (!patient.photoStorageKey || !this.r2.isConfigured) return patient;
    return { ...patient, photoUrl: await this.signOrNull(patient.photoStorageKey) };
  }

  withAccessUrls<T extends WithPhoto>(patients: T[]): Promise<T[]> {
    return Promise.all(patients.map((patient) => this.withAccessUrl(patient)));
  }

  assertUploadable(file: Express.Multer.File, opts: { checkSize: boolean }) {
    if (!this.r2.isConfigured) {
      throw new BadRequestException('Cloudflare R2 não está configurado. Não é possível enviar a foto.');
    }
    if (!PATIENT_PHOTO_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Use uma imagem JPEG, PNG ou WebP.');
    }
    if (opts.checkSize && file.size > PATIENT_PHOTO_MAX_BYTES) {
      throw new BadRequestException('A foto deve ter no máximo 5 MB.');
    }
  }

  async uploadProfilePhoto(patientId: string, file: Express.Multer.File) {
    const ext =
      file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const { key } = await this.r2.upload(`foto.${ext}`, file.mimetype, file.buffer, `pacientes/${patientId}`);
    return key;
  }

  /** Foto "antes e depois": comprimida antes do upload. */
  async uploadGalleryPhoto(patientId: string, phase: string, file: Express.Multer.File) {
    const compressed = await this.compression.compress(file.buffer, file.mimetype);
    const { key } = await this.r2.upload(
      `${phase.toLowerCase()}.jpg`,
      compressed.mimeType,
      compressed.buffer,
      `pacientes/${patientId}/fotos`,
    );
    return { key, mimeType: compressed.mimeType, size: compressed.compressedSize };
  }

  remove(key: string) {
    return this.r2.remove(key);
  }
}
