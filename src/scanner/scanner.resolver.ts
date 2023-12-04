import { Resolver, Query, Args } from '@nestjs/graphql';
import { ScanAllResponse, ScanSingleResponse } from './scanner.models';
import { ScannerService } from './scanner.service';

@Resolver()
export class ScannerResolver {
  constructor(private readonly scannerService: ScannerService) {}

  @Query(() => [ScanAllResponse])
  getRepositories(): Promise<ScanAllResponse[]> {
    return this.scannerService.scanAll();
  }

  @Query(() => ScanSingleResponse)
  async getSingleRepo(
    @Args('repoName') repoName: string,
  ): Promise<ScanAllResponse> {
    return this.scannerService.scanSingle(repoName);
  }
}
