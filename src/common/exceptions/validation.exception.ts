import { AppException } from './app.exception';

export class ValidationException extends AppException {
  constructor(message: string) {
    super(message);
  }
}
