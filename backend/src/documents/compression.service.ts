import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

/** Tipos MIME que o Sharp consegue comprimir. */
const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Tipos MIME de PDF. */
const PDF_MIMES = new Set(['application/pdf']);

export interface CompressionResult {
  buffer: Buffer;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
}

@Injectable()
export class CompressionService {
  private readonly logger = new Logger(CompressionService.name);

  /**
   * Comprime o buffer se for imagem ou PDF.
   * Retorna o buffer original para tipos não suportados.
   */
  async compress(
    buffer: Buffer,
    mimeType: string,
  ): Promise<CompressionResult> {
    const originalSize = buffer.length;

    if (IMAGE_MIMES.has(mimeType)) {
      return this.compressImage(buffer, mimeType, originalSize);
    }

    if (PDF_MIMES.has(mimeType)) {
      return this.compressPdf(buffer, originalSize);
    }

    // Tipo não suportado — retorna sem alteração
    return { buffer, mimeType, originalSize, compressedSize: originalSize };
  }

  /** Comprime imagens com Sharp. Converte PNG/GIF para WebP quando vantajoso. */
  private async compressImage(
    buffer: Buffer,
    mimeType: string,
    originalSize: number,
  ): Promise<CompressionResult> {
    try {
      let result: Buffer;
      let outputMime = mimeType;

      if (mimeType === 'image/jpeg') {
        result = await sharp(buffer)
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer();
      } else if (mimeType === 'image/png') {
        // Tenta WebP primeiro (geralmente menor)
        const webpBuffer = await sharp(buffer)
          .webp({ quality: 80 })
          .toBuffer();
        const pngBuffer = await sharp(buffer)
          .png({ compressionLevel: 9, palette: true })
          .toBuffer();

        if (webpBuffer.length < pngBuffer.length) {
          result = webpBuffer;
          outputMime = 'image/webp';
        } else {
          result = pngBuffer;
        }
      } else if (mimeType === 'image/webp') {
        result = await sharp(buffer)
          .webp({ quality: 80 })
          .toBuffer();
      } else {
        // GIF → WebP animado
        result = await sharp(buffer, { animated: true })
          .webp({ quality: 75 })
          .toBuffer();
        outputMime = 'image/webp';
      }

      // Só usa o resultado comprimido se for menor
      if (result.length >= originalSize) {
        this.logger.debug(
          `Imagem já otimizada (${originalSize} bytes), mantendo original.`,
        );
        return { buffer, mimeType, originalSize, compressedSize: originalSize };
      }

      const savings = ((1 - result.length / originalSize) * 100).toFixed(1);
      this.logger.log(
        `Imagem comprimida: ${originalSize} → ${result.length} bytes (-${savings}%)`,
      );

      return {
        buffer: result,
        mimeType: outputMime,
        originalSize,
        compressedSize: result.length,
      };
    } catch (err) {
      this.logger.warn(`Falha ao comprimir imagem: ${err.message}. Usando original.`);
      return { buffer, mimeType, originalSize, compressedSize: originalSize };
    }
  }

  /**
   * Comprime PDFs com pdf-lib: reserializa o documento removendo
   * objetos órfãos, duplicatas e otimizando a estrutura interna.
   */
  private async compressPdf(
    buffer: Buffer,
    originalSize: number,
  ): Promise<CompressionResult> {
    try {
      const pdfDoc = await PDFDocument.load(buffer, {
        ignoreEncryption: true,
      });

      const result = Buffer.from(
        await pdfDoc.save({
          useObjectStreams: true,     // agrupa objetos pequenos em streams comprimidos
          addDefaultPage: false,
          objectsPerTick: 100,
        }),
      );

      if (result.length >= originalSize) {
        this.logger.debug(
          `PDF já otimizado (${originalSize} bytes), mantendo original.`,
        );
        return {
          buffer,
          mimeType: 'application/pdf',
          originalSize,
          compressedSize: originalSize,
        };
      }

      const savings = ((1 - result.length / originalSize) * 100).toFixed(1);
      this.logger.log(
        `PDF comprimido: ${originalSize} → ${result.length} bytes (-${savings}%)`,
      );

      return {
        buffer: result,
        mimeType: 'application/pdf',
        originalSize,
        compressedSize: result.length,
      };
    } catch (err) {
      this.logger.warn(`Falha ao comprimir PDF: ${err.message}. Usando original.`);
      return {
        buffer,
        mimeType: 'application/pdf',
        originalSize,
        compressedSize: originalSize,
      };
    }
  }
}
