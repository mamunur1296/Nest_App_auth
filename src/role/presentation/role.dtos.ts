import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateRoleDto {
  @IsString({ message: 'Role name must be a string' })
  @IsNotEmpty({ message: 'Role name is required' })
  @Matches(/^[A-Z_]+$/, {
    message: 'Role name must contain only uppercase letters and underscores',
  })
  public readonly name!: string;
}

export class UpdateRoleDto {
  @IsString({ message: 'Role name must be a string' })
  @IsNotEmpty({ message: 'Role name is required' })
  @Matches(/^[A-Z_]+$/, {
    message: 'Role name must contain only uppercase letters and underscores',
  })
  public readonly name!: string;
}
