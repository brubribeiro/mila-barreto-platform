import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class R2StorageService implements OnModuleInit {
  private client: S3Client | null = null;
  private bucket: string;
  private publicUrl: string;
  private readonly logger = new Logger(R2StorageService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = this.config.get<string>('R2_BUCKET_NAME', 'mila-barreto-platform');
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL', '');

    if (!accountId || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'Cloudflare R2 não configurado (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY ausentes). Upload desabilitado.',
      );
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log('Cloudflare R2 configurado com sucesso.');
  }

  get isConfigured(): boolean {
    return !!this.client;
  }

  /**
   * Faz upload de um arquivo para o R2.
   * Retorna a key (caminho no bucket) e a URL pública.
   */
  async upload(
    fileName: string,
    mimeType: string,
    buffer: Buffer,
    subfolder?: string,
  ): Promise<{ key: string; url: string }> {
    if (!this.client) throw new Error('Cloudflare R2 não está configurado.');

    // Gera key única: subfolder/uuid-filename
    const uuid = randomUUID().slice(0, 8);
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = subfolder
      ? `${subfolder}/${uuid}-${safeName}`
      : `${uuid}-${safeName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    const url = this.publicUrl
      ? `${this.publicUrl.replace(/\/$/, '')}/${key}`
      : `https://${this.bucket}.r2.dev/${key}`;

    return { key, url };
  }

  /** Remove um arquivo do R2 pela key. */
  async remove(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (err) {
      this.logger.warn(`Falha ao excluir arquivo do R2 (${key}): ${err.message}`);
    }
  }

  /** Retorna o conteúdo de um arquivo como Buffer (para proxy/download). */
  async download(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (!this.client) throw new Error('Cloudflare R2 não está configurado.');

    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as any) {
      chunks.push(Buffer.from(chunk));
    }

    return {
      buffer: Buffer.concat(chunks),
      contentType: res.ContentType ?? 'application/octet-stream',
    };
  }
}
