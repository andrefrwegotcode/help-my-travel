import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard statistics' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  async getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(+page, +limit, search);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'List all reviews for moderation' })
  async getReviews(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getReviews(+page, +limit);
  }

  @Get('photos')
  @ApiOperation({ summary: 'List all photos for moderation' })
  async getPhotos(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getPhotos(+page, +limit);
  }

  @Get('menu-cache')
  @ApiOperation({ summary: 'List menu cache entries' })
  async getMenuCaches(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getMenuCaches(+page, +limit);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a user (admin can set role)' })
  async createUser(@Body() body: { name: string; email: string; password: string; role: 'USER' | 'ADMIN' }) {
    return this.adminService.createUser(body);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change user role' })
  async updateUserRole(@Param('id') id: string, @Body() body: { role: 'USER' | 'ADMIN' }) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user' })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete a review' })
  async deleteReview(@Param('id') id: string) {
    return this.adminService.deleteReview(id);
  }

  @Delete('photos/:id')
  @ApiOperation({ summary: 'Delete a photo' })
  async deletePhoto(@Param('id') id: string) {
    return this.adminService.deletePhoto(id);
  }
}
