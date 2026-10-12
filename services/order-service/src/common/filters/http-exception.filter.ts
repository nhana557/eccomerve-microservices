import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorResponse } from '../dto/response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'Terjadi kesalahan pada server';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        errorMessage = res;
      } else if (typeof res === 'object' && res !== null) {
        const anyRes = res as any;
        errorMessage = anyRes.message
          ? Array.isArray(anyRes.message)
            ? anyRes.message.join(', ')
            : anyRes.message
          : exception.message;
        errorCode = anyRes.error || this.getErrorCodeByStatus(status);
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
      errorCode = 'SERVER_ERROR';
    }

    const payload: ApiErrorResponse = {
      success: false,
      data: null,
      error: {
        code: errorCode,
        message: errorMessage,
      },
      meta: {
        timestamp: new Date().toISOString(),
        service: 'order-service',
      },
    };

    response.status(status).json(payload);
  }

  private getErrorCodeByStatus(status: number): string {
    switch (status) {
      case 400:
        return 'VALIDATION_FAILED';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 405:
        return 'METHOD_NOT_ALLOWED';
      case 409:
        return 'CONFLICT';
      default:
        return 'ERROR';
    }
  }
}
