import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ScannerResolver } from './scanner.resolver';
import { GithubScannerService, ScannerService } from './scanner.service';
import { GithubScannerRepository, ScannerRepository } from './scanner.repository';


@Module({
    imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            autoSchemaFile: true,
        })
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
            useClass: GithubScannerRepository,
        },
    ],
})
export class ScannerModule { }
