import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScanAllResponse, ScanSingleResponse, WebHook } from './scanner.models';
import { request } from 'undici';
import { ContentType, EnvVariables } from './scanner.consts';

export abstract class ScannerRepository {
  abstract scanRepo(repoName: string): Promise<ScanAllResponse>;
  abstract countFilesInRepo(repoName: string): Promise<number>;
  abstract scanSingleRepo(repoName: string): Promise<ScanSingleResponse>;
}

@Injectable()
export class GithubScannerRepository implements ScannerRepository {
  private _userName: string;
  private _token: string;
  private _ymlFilePath: string;
  private _deafultHeaders: Record<string, string>;

  constructor(private readonly configService: ConfigService) {
    this._userName = this.configService.getOrThrow(EnvVariables.githubUsername);
    this._token = this.configService.getOrThrow(EnvVariables.githubToken);

    this._deafultHeaders = {
      Authorization: `Bearer ${this._token}`,
      Accept: 'application/json',
      'User-Agent': 'nestjs-graphql-github-scanner',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async scanRepo(repoName: string): Promise<ScanAllResponse> {
    try {
      const { body } = await request(
        `https://api.github.com/repos/${this._userName}/${repoName}`,
        {
          headers: this._deafultHeaders,
        },
      );

      return body.json() as Promise<ScanAllResponse>;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException();
    }
  }

  async scanSingleRepo(repoName: string): Promise<ScanSingleResponse> {
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
    const { body } = await request(
      `https://api.github.com/repos/${this._userName}/${repoName}/hooks`,
      { headers: this._deafultHeaders },
    );
    const result = await body.json();

    return (result as WebHook[]).filter((item) => item.active);
  }
}
