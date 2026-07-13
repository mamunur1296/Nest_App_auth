import { AppException } from './app.exception';

export class ConflictException extends AppException {
  constructor(message: string) {
    super(message);
  }
}
