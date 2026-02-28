import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TranslateDto {
  @ApiProperty({ example: 'I would like to order the pasta, please.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  text: string;

  @ApiProperty({ example: 'en', description: 'Source language ISO code' })
  @IsString()
  fromLanguage: string;

  @ApiProperty({ example: 'it', description: 'Target language ISO code' })
  @IsString()
  toLanguage: string;
}
