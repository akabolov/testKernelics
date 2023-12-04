import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RepositoryOwner {
  @Field(() => String)
  login: string;
}

@ObjectType()
export class ScanAllResponse {
  @Field(() => String)
  name: string;

  @Field(() => Int)
  size: number;

  @Field(() => RepositoryOwner)
  owner: RepositoryOwner;

  @Field(() => Boolean)
  private: boolean;
}

@ObjectType()
export class WebHook {
  @Field(() => String)
  type: string;

  @Field(() => Int)
  id: number;

  @Field(() => Boolean)
  active: boolean;

  @Field(() => String)
  url: string;
}

@ObjectType()
export class ScanSingleResponse extends ScanAllResponse {
  @Field(() => Int)
  count: number;

  @Field(() => String)
  ymlFileContent: string;

  @Field(() => [WebHook])
  webHooks: WebHook[];
}
