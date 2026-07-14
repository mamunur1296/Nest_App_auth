import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../exceptions/app.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { ConflictException } from '../exceptions/conflict.exception';
import { ValidationException } from '../exceptions/validation.exception';
import { ForbiddenException } from '../exceptions/forbidden.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent = exception.getResponse();
      if (typeof resContent === 'object' && resContent !== null) {
        message = (resContent as any).message || exception.message;
        errorType = (resContent as any).error || exception.name;
      } else {
        message = exception.message;
        errorType = exception.name;
      }
    } else if (exception instanceof AppException) {
      if (exception instanceof NotFoundException) {
        status = HttpStatus.NOT_FOUND;
        errorType = 'NotFound';
      } else if (exception instanceof ConflictException) {
        status = HttpStatus.CONFLICT;
        errorType = 'Conflict';
      } else if (exception instanceof ValidationException) {
        status = HttpStatus.BAD_REQUEST;
        errorType = 'BadRequest';
      } else if (exception instanceof ForbiddenException) {
        status = HttpStatus.FORBIDDEN;
        errorType = 'Forbidden';
      } else {
        status = HttpStatus.BAD_REQUEST;
        errorType = 'BadRequest';
      }
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorType = exception.name;
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(`Unknown error: ${String(exception)}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error: errorType,
    });
  }
}
