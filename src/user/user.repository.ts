import { Injectable } from '@nestjs/common';
import { request } from 'undici';
import { User } from './user.model';
import { ConfigService } from '@nestjs/config';

export abstract class UserRepository {
  abstract getUserByToken(): Promise<User>;
}

@Injectable()
export class GithubUserRepository implements UserRepository {
  private _defaultHeaders: Record<string, string>;
  constructor(private configService: ConfigService) {
    this._defaultHeaders = {
      Authorization: `Bearer ${this.configService.getOrThrow('GITHUB_TOKEN')}`,
      Accept: 'application/json',
      'User-Agent': 'nestjs-graphql-github-scanner',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }
  async getUserByToken(): Promise<User> {
    const { body } = await request(`https://api.github.com/user`, {
      headers: this._defaultHeaders,
    });

    return body.json() as Promise<User>;
  }
}
