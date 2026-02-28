import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get(':placeId')
  @ApiOperation({ summary: 'Get all reviews for a restaurant' })
  async findByPlace(@Param('placeId') placeId: string) {
    return this.reviewsService.findByPlace(placeId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new review' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update your review' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<CreateReviewDto>,
  ) {
    return this.reviewsService.update(id, userId, { rating: dto.rating, comment: dto.comment });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete your review (admins can delete any)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.reviewsService.remove(id, userId, role);
  }
}
