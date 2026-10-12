import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { R2StorageService } from './r2-storage.service';
import { CompressionService } from './compression.service';
import { DocumentTemplatesService } from './document-templates.service';
import { DocumentTemplatesController } from './document-templates.controller';

@Module({
  imports: [ConfigModule],
  providers: [DocumentsService, DocumentTemplatesService, R2StorageService, CompressionService],
  controllers: [DocumentsController, DocumentTemplatesController],
})
export class DocumentsModule {}
