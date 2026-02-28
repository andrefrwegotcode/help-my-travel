import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { PhotosService } from './photos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MAX_PHOTOS_PER_UPLOAD, MAX_PHOTO_SIZE_MB } from '@helpmytravel/shared';

@ApiTags('photos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('photos')
export class PhotosController {
  constructor(private photosService: PhotosService) {}

  @Get(':placeId')
  @ApiOperation({ summary: 'Get all photos for a restaurant' })
  async findByPlace(@Param('placeId') placeId: string) {
    return this.photosService.findByPlace(placeId);
  }

  @Post()
  @ApiOperation({ summary: 'Upload photos for a restaurant' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('photos', MAX_PHOTOS_PER_UPLOAD))
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_PHOTO_SIZE_MB * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|heic)/ }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
    @Body('placeId') placeId: string,
    @Body('placeName') placeName: string,
    @Body('caption') caption?: string,
  ) {
    return this.photosService.create(userId, files, { placeId, placeName, caption });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a photo (owner or admin)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.photosService.remove(id, userId, role);
  }
}
