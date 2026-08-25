import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { R2StorageService } from '../documents/r2-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [UsersService, R2StorageService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
