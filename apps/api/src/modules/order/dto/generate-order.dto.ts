import { IsString, IsArray, IsOptional, ValidateNested, IsNumber, Min, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MenuItemDto {
  @IsString() id: string;
  @IsString() name: string;
  @IsString() nameOriginal: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() price?: string;
  @IsOptional() @IsNumber() priceValue?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() category?: string;
}

class OrderItemDto {
  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => MenuItemDto)
  menuItem: MenuItemDto;

  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class GenerateOrderDto {
  @ApiProperty()
  @IsString()
  placeId: string;

  @ApiProperty()
  @IsString()
  placeName: string;

  @ApiProperty({ description: 'ISO language code of the restaurant location' })
  @IsString()
  placeLanguage: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tableNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
