import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '../dto/response.dto';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (req.url === '/metrics') {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If data is already in response envelope format, return as is
        if (data && typeof data === 'object' && 'success' in data && 'meta' in data) {
          return data;
        }

        return {
          success: true,
          data,
          error: null,
          meta: {
            timestamp: new Date().toISOString(),
            service: 'order-service',
          },
        };
      }),
    );
  }
}
