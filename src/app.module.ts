import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScannerModule } from './scanner/scanner.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';

@Module({
  imports: [ScannerModule, ConfigModule.forRoot({
    isGlobal: true,
  }), UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
