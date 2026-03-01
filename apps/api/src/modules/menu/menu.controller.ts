import {
  Controller, Get, Post, Param, Query, Delete, Body,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
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

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Poll menu discovery job status' })
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.menuService.getJobStatus(jobId);
  }

  @Post('scan-url')
  @ApiOperation({ summary: 'Scan a URL (from QR code) and extract/translate menu' })
  async scanUrl(
    @Body() body: { url: string; placeId: string; language?: string },
    @CurrentUser('language') userLanguage?: string,
  ) {
    const lang = body.language || userLanguage || 'en';
    return this.menuService.scanUrl(body.url, body.placeId, lang);
  }

  @Post('scan-photo')
  @ApiOperation({ summary: 'Scan a photo of a physical menu via OCR' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  async scanPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { placeId: string; language?: string },
    @CurrentUser('language') userLanguage?: string,
  ) {
    if (!file) throw new Error('No photo uploaded');
    const lang = body.language || userLanguage || 'en';
    return this.menuService.scanPhoto(file, body.placeId, lang);
  }

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

  @Delete('cache')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[Admin] Invalidate ALL menu cache' })
  async invalidateAllCache() {
    return this.menuService.invalidateAllCache();
  }

  @Delete('cache/:placeId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[Admin] Invalidate menu cache for a place' })
  async invalidateCache(@Param('placeId') placeId: string) {
    return this.menuService.invalidateCache(placeId);
  }
}
