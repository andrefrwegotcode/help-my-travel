import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PlacesService } from './places.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { RadiusOption } from '@helpmytravel/shared';

@ApiTags('places')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('places')
export class PlacesController {
  constructor(private placesService: PlacesService) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Find restaurants near a GPS location' })
  @ApiQuery({ name: 'lat', required: false, type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lng', required: false, type: Number, description: 'Longitude' })
  @ApiQuery({ name: 'radius', required: true, enum: [1, 5, 10, 15], description: 'Search radius in km' })
  @ApiQuery({ name: 'language', required: false, type: String, description: 'Language code (en, pt, es...)' })
  async findNearby(
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('radius') radius: RadiusOption = 5,
    @Query('language') language?: string,
  ) {
    return this.placesService.findNearby({ lat: lat ? +lat : undefined, lng: lng ? +lng : undefined, radius, language });
  }

  @Get('search')
  @ApiOperation({ summary: 'Find restaurants near a manual address' })
  @ApiQuery({ name: 'address', required: true, type: String })
  @ApiQuery({ name: 'radius', required: true, enum: [1, 5, 10, 15] })
  @ApiQuery({ name: 'language', required: false, type: String })
  async searchByAddress(
    @Query('address') address: string,
    @Query('radius') radius: RadiusOption = 5,
    @Query('language') language?: string,
  ) {
    return this.placesService.findNearby({ address, radius, language });
  }

  @Get('photo/:photoReference')
  @ApiOperation({ summary: 'Get Google Places photo URL' })
  getPhotoUrl(
    @Param('photoReference') photoReference: string,
    @Query('maxWidth') maxWidth = 400,
  ) {
    return { url: this.placesService.getPhotoUrl(photoReference, +maxWidth) };
  }

  @Get(':placeId')
  @ApiOperation({ summary: 'Get restaurant details from Google Places' })
  @ApiQuery({ name: 'language', required: false })
  async getDetails(
    @Param('placeId') placeId: string,
    @Query('language') language?: string,
  ) {
    return this.placesService.getPlaceDetails(placeId, language);
  }
}
