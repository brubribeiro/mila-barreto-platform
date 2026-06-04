import { Module } from '@nestjs/common';
import { ProceduresService } from './procedures.service';
import { ProceduresController } from './procedures.controller';

@Module({
  providers: [ProceduresService],
  controllers: [ProceduresController],
})
export class ProceduresModule {}
