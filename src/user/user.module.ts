import { Module } from '@nestjs/common';
import { GithubUserRepository, UserRepository } from './user.repository';

@Module({
  providers: [
    {
      provide: UserRepository,
      useClass: GithubUserRepository,
    },
  ],
  exports: [UserRepository],
})
export class UserModule {}
