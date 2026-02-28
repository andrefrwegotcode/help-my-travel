import { IsOptional, IsString, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const VALID_LANGUAGES = ['en','pt','es','fr','de','it','ja','zh','ko','ar','ru','nl','pl','tr'];

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'pt', description: 'ISO language code' })
  @IsOptional()
  @IsIn(VALID_LANGUAGES)
  language?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;
}
