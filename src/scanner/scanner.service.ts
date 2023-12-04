import { Injectable } from '@nestjs/common';
import { RepoListResponse, RepoDetailsResponse } from './scanner.models';
import { ScannerRepository } from './scanner.repository';
import { ConfigService } from '@nestjs/config';
import { EnvVariables } from './scanner.consts';

export abstract class ScannerService {
  abstract scanAll(): Promise<RepoListResponse[]>;
  abstract scanSingle(repoName: string): Promise<RepoDetailsResponse>;
}

@Injectable()
export class GithubScannerService implements ScannerService {
  constructor(
    private repository: ScannerRepository,
    private readonly configService: ConfigService,
  ) {}

  scanAll(): Promise<RepoListResponse[]> {
    return this._processBatchScanning();
  }

  async scanSingle(repoName: string): Promise<RepoDetailsResponse> {
    return this.repository.scanRepoDetails(repoName);
  }

  private async _processBatchScanning() {
    const repos = this.configService
      .getOrThrow(EnvVariables.repoList)
      .split(',');
    const maxConcurrencyLimit = Number(
      this.configService.getOrThrow(EnvVariables.concurrencyLimit),
    );

    const reposLength = repos.length;
    let processed = 0;
    const processedRepos: RepoListResponse[] = [];

    while (processed < reposLength) {
      const result = await Promise.all(
        repos
          .slice(processed, processed + maxConcurrencyLimit)
          .map(async (repoName: string) => this.repository.scanRepo(repoName)),
      );

      processed += maxConcurrencyLimit;

      processedRepos.push(...result);
    }

    return processedRepos;
  }
}
