import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { PatientPhotoStorageService } from './patient-photo-storage.service';
import { PatientStatsService } from './patient-stats.service';
import { PatientEventsService } from './patient-events.service';
import { R2StorageService } from '../documents/r2-storage.service';
import { CompressionService } from '../documents/compression.service';

@Module({
  imports: [ConfigModule],
  providers: [
    PatientsService,
    PatientPhotoStorageService,
    PatientStatsService,
    PatientEventsService,
    R2StorageService,
    CompressionService,
  ],
  controllers: [PatientsController],
})
export class PatientsModule {}
