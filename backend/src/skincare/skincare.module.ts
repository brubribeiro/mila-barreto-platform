import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SkincareService } from './skincare.service';
import { SkincareController } from './skincare.controller';

@Module({
  imports: [PrismaModule],
  providers: [SkincareService],
  controllers: [SkincareController],
})
export class SkincareModule {}
