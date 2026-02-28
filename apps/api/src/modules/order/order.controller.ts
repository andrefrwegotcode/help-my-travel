import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { GenerateOrderDto } from './dto/generate-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('order')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate order text in restaurant local language',
    description: 'Receives selected menu items with quantities and returns formatted order text translated to the restaurant\'s local language.',
  })
  async generateOrder(@Body() dto: GenerateOrderDto) {
    return this.orderService.generateOrder(dto as any);
  }
}
