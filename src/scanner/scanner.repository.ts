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
    let ymlFileContent = '';

    const [repoInfo, { count, pathToYml }, webHooks] = await Promise.all([
      this.scanRepo(repoName),
      this.countFilesInRepo(repoName),
      this.getActiveWebHooks(repoName),
    ]);

    if (pathToYml.length > 0) {
      ymlFileContent = await this.getContentOfFirstYmlFile(repoName, pathToYml);
    }

    return {
      ...repoInfo,
      count,
      ymlFileContent,
      webHooks,
    };
  }

  async getContentOfFirstYmlFile(
    repoName: string,
    pathToYml: string,
  ): Promise<string> {
    try {
      if (!pathToYml.length) {
        return '';
      }

      let content = '';

      const { body } = await request(
        `https://api.github.com/repos/${this._userName}/${repoName}/contents/${pathToYml}`,
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

      return content;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException();
    }
  }

  async countFilesInRepo(
    repoName: string,
    path = '',
  ): Promise<{ count: number; pathToYml: string }> {
    try {
      let pathToYml = '';
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
          count += result.count;
        } else if (item.type === ContentType.file) {
          if (
            item.name?.includes('.yml') ||
            (item.name?.includes('.yaml') && !pathToYml.length)
          ) {
            pathToYml = item.path;
          }
          count++;
        }
      }

      return { count, pathToYml };
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

      console.log(result);

      return (result as WebHook[])?.filter?.((item) => item.active);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException();
    }
  }
}
