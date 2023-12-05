import { Resolver, Query, Args } from '@nestjs/graphql';
import { RepoListResponse, RepoDetailsResponse } from './scanner.models';
import { ScannerService } from './scanner.service';
import { AsyncLimiter } from './scanner.limiter';

@Resolver()
export class ScannerResolver {
  constructor(
    private readonly scannerService: ScannerService,
    private readonly asyncLimiter: AsyncLimiter,
  ) {}

  @Query(() => [RepoListResponse])
  listRepositories(): Promise<RepoListResponse[]> {
    return this.scannerService.scanAll();
  }

  @Query(() => RepoDetailsResponse)
  async repoDetails(
    @Args('repoName') repoName: string,
  ): Promise<RepoListResponse> {
    const limiter = this.asyncLimiter.getLimiter();

    // return this.scannerService.scanSingle(repoName);

    return limiter(() => this.scannerService.scanSingle(repoName));
  }
}
