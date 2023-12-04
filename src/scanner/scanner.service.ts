import { Injectable } from '@nestjs/common';
import { ScanAllResponse, ScanSingleResponse } from './scanner.models';
import { ScannerRepository } from './scanner.repository';
import { ConfigService } from '@nestjs/config';
import { EnvVariables } from './scanner.consts';

export abstract class ScannerService {
  abstract scanAll(): Promise<ScanAllResponse[]>;
  abstract scanSingle(repoName: string): Promise<ScanSingleResponse>;
}

@Injectable()
export class GithubScannerService implements ScannerService {
  constructor(
    private repository: ScannerRepository,
    private readonly configService: ConfigService,
  ) {}

  scanAll(): Promise<ScanAllResponse[]> {
    return this._processBatchScanning();
  }

  async scanSingle(repoName: string): Promise<ScanSingleResponse> {
    return this.repository.scanSingleRepo(repoName);
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
    const processedRepos: ScanAllResponse[] = [];

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
