import { Injectable } from '@nestjs/common';
import { RepoListResponse, RepoDetailsResponse } from './scanner.models';
import { ScannerRepository } from './scanner.repository';
import { ConfigService } from '@nestjs/config';

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
    return this.repository.scanAllRepos();
  }

  async scanSingle(repoName: string): Promise<RepoDetailsResponse> {
    return this.repository.scanRepoDetails(repoName);
  }
}
