import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { R2StorageService } from './r2-storage.service';
import { CompressionService } from './compression.service';

@Module({
  imports: [ConfigModule],
  providers: [DocumentsService, R2StorageService, CompressionService],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
