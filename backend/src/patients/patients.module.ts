import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { R2StorageService } from '../documents/r2-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [PatientsService, R2StorageService],
  controllers: [PatientsController],
})
export class PatientsModule {}
