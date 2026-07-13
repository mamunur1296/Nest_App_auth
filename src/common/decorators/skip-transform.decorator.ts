import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipTransform';
export const SkipTransform = (): CustomDecorator<string> =>
  SetMetadata(SKIP_TRANSFORM_KEY, true);
