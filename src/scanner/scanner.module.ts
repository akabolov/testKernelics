import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ScannerResolver } from './scanner.resolver';
import { GithubScannerService, ScannerService } from './scanner.service';
import {
  GithubScannerRepository,
  ScannerRepository,
} from './scanner.repository';
import { UserModule } from 'src/user/user.module';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from 'src/user/user.repository';
import { AsyncLimiter } from './scanner.limiter';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
    }),
    UserModule,
  ],
  controllers: [],
  providers: [
    ScannerResolver,
    {
      provide: ScannerService,
      useClass: GithubScannerService,
    },
    {
      provide: ScannerRepository,
      inject: [ConfigService, UserRepository],
      useFactory: async (
        configService: ConfigService,
        userRepository: UserRepository,
      ) => {
        const user = await userRepository.getUserByToken();
        return new GithubScannerRepository(configService, user.login);
      },
    },

    {
      provide: AsyncLimiter,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // return AsyncLimiter.getInstance(configService);
        return new AsyncLimiter(configService);
      },
    },
  ],
})
export class ScannerModule {}
