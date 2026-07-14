import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T> | T> {
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        let message = 'Operation successful';
        let payload = data;
        let meta: any = undefined;

        if (data && typeof data === 'object') {
          // If the return contains both a message and data payload
          if ('message' in data && 'data' in data) {
            message = data.message;
            payload = data.data;
            if ('meta' in data) {
              meta = data.meta;
            }
          }
          // If it contains only a message (e.g. for delete operations)
          else if ('message' in data && Object.keys(data).length === 1) {
            message = data.message;
            payload = null;
          }
        }

        return {
          success: true,
          message,
          data: payload === undefined ? null : payload,
          ...(meta !== undefined ? { meta } : {}),
        };
      }),
    );
  }
}
