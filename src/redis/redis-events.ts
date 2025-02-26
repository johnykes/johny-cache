import { Field, ObjectType } from '@nestjs/graphql';

export const CACHE_DELETE_NOTIFICATION_EVENT =
  'redis_pub_sub_cache_delete_event';
export const CACHE_REFRESH_NOTIFICATION_EVENT =
  'redis_pub_sub_cache_refresh_event';

@ObjectType()
export class CachePubSubEventRes {
  @Field(() => Boolean, { nullable: true })
  success?: boolean;
  @Field(() => String, { nullable: true })
  message?: string;

  constructor(init?: Partial<CachePubSubEventRes>) {
    Object.assign(this, init);
  }
}
