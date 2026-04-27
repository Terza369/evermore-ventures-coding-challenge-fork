import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: HttpStatus;
    let body: Record<string, unknown>;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        body = { statusCode: status, message: exceptionResponse };
      } else {
        body = { statusCode: status, ...(exceptionResponse as object) };
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      body = {
        statusCode: status,
        message: 'Internal server error',
      };
    }

    response.status(status).json(body);
  }
}
