import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RepoListResponse,
  RepoDetailsResponse,
  WebHook,
} from './scanner.models';
import { request } from 'undici';
import { ContentType, EnvVariables } from './scanner.consts';

export abstract class ScannerRepository {
  abstract scanAllRepos(): Promise<RepoListResponse[]>;
  abstract scanRepo(repoName: string): Promise<RepoListResponse>;
  abstract scanRepoDetails(repoName: string): Promise<RepoDetailsResponse>;
}

@Injectable()
export class GithubScannerRepository implements ScannerRepository {
  private _token: string;
  private _ymlFilePath: string;
  private _deafultHeaders: Record<string, string>;

  constructor(
    private readonly configService: ConfigService,
    private _userName: string,
  ) {
    this._token = this.configService.getOrThrow(EnvVariables.githubToken);

    this._deafultHeaders = {
      Authorization: `Bearer ${this._token}`,
      Accept: 'application/json',
      'User-Agent': 'nestjs-graphql-github-scanner',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async scanAllRepos(): Promise<RepoListResponse[]> {
    try {
      const { body } = await request(
        `https://api.github.com/users/${this._userName}/repos`,
        {
          headers: this._deafultHeaders,
        },
      );

      return body.json() as Promise<RepoListResponse[]>;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException();
    }
  }

  async scanRepo(repoName: string): Promise<RepoListResponse> {
    try {
      const { body } = await request(
        `https://api.github.com/repos/${this._userName}/${repoName}`,
        {
          headers: this._deafultHeaders,
        },
      );

      return body.json() as Promise<RepoListResponse>;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException();
    }
  }

  async scanRepoDetails(repoName: string): Promise<RepoDetailsResponse> {
    console.log('DOING THE SCAN');

    const [repoInfo, count, webHooks] = await Promise.all([
      this.scanRepo(repoName),
      this.countFilesInRepo(repoName),
      this.getActiveWebHooks(repoName),
    ]);

    const ymlFileContent = await this.getContentOfFirstYmlFile(repoName);

    return {
      ...repoInfo,
      count,
      ymlFileContent,
      webHooks,
    };
  }

  async getContentOfFirstYmlFile(repoName: string): Promise<string> {
    try {
      let content = '';

      if (this._ymlFilePath) {
        const { body } = await request(
          `https://api.github.com/repos/${this._userName}/${repoName}/contents/${this._ymlFilePath}`,
          {
            headers: this._deafultHeaders,
          },
        );

        const result = (await body.json()) as {
          content: string;
          encoding: 'base64' | 'utf-8';
        };

        const buffer = Buffer.from(result.content, result.encoding);
        content = buffer.toString('utf-8');
      }

      return content;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException();
    }
  }

  async countFilesInRepo(repoName: string, path = ''): Promise<number> {
    try {
      let count = 0;

      const { body } = await request(
        `https://api.github.com/repos/${this._userName}/${repoName}/contents/${path}`,
        {
          headers: this._deafultHeaders,
        },
      );
      const content = (await body.json()) as any[];

      for (const item of content) {
        if (item.type === ContentType.dir) {
          const result = await this.countFilesInRepo(repoName, item.path);
          count += result;
        } else if (item.type === ContentType.file) {
          if (item.name?.includes('.yml') && !this._ymlFilePath) {
            this._ymlFilePath = item.path;
          }
          count++;
        }
      }

      return count;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException();
    }
  }

  async getActiveWebHooks(repoName: string): Promise<WebHook[]> {
    try {
      const { body } = await request(
        `https://api.github.com/repos/${this._userName}/${repoName}/hooks`,
        { headers: this._deafultHeaders },
      );
      const result = await body.json();

      return (result as WebHook[]).filter((item) => item.active);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException();
    }
  }
}
