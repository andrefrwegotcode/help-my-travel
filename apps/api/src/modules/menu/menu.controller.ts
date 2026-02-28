import { Controller, Get, Param, Query, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('menu')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get(':placeId')
  @ApiOperation({
    summary: 'Get (or trigger discovery of) a translated restaurant menu',
    description: 'Returns cached menu if available, otherwise starts a background job and returns jobId.',
  })
  @ApiQuery({ name: 'language', required: false, description: 'Override language (defaults to user language)' })
  async getMenu(
    @Param('placeId') placeId: string,
    @Query('language') language?: string,
    @CurrentUser('language') userLanguage?: string,
  ) {
    const lang = language || userLanguage || 'en';
    return this.menuService.getMenu(placeId, lang);
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Poll menu discovery job status' })
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.menuService.getJobStatus(jobId);
  }

  @Delete('cache/:placeId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[Admin] Invalidate menu cache for a place' })
  async invalidateCache(@Param('placeId') placeId: string) {
    return this.menuService.invalidateCache(placeId);
  }
}
