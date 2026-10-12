import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';

@Module({
  imports: [PrismaModule],
  providers: [GoalsService],
  controllers: [GoalsController],
})
export class GoalsModule {}
