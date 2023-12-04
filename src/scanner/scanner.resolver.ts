import { Resolver, Query, Args } from '@nestjs/graphql';
import { RepoListResponse, RepoDetailsResponse } from './scanner.models';
import { ScannerService } from './scanner.service';

@Resolver()
export class ScannerResolver {
  constructor(private readonly scannerService: ScannerService) {}

  @Query(() => [RepoListResponse])
  listRepositories(): Promise<RepoListResponse[]> {
    return this.scannerService.scanAll();
  }

  @Query(() => RepoDetailsResponse)
  async repoDetails(
    @Args('repoName') repoName: string,
  ): Promise<RepoListResponse> {
    return this.scannerService.scanSingle(repoName);
  }
}
