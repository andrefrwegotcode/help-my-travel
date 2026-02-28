import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  PlaceType1,
  Language,
} from '@googlemaps/google-maps-services-js';
import { RADIUS_METERS } from '@helpmytravel/shared';
import type { RadiusOption } from '@helpmytravel/shared';

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly mapsClient: Client;

  constructor(private config: ConfigService) {
    this.mapsClient = new Client({});
  }

  async findNearby(params: {
    lat?: number;
    lng?: number;
    address?: string;
    radius: RadiusOption;
    language?: string;
  }) {
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY');
    if (!apiKey) throw new BadRequestException('Google Places API key not configured');

    let lat = params.lat;
    let lng = params.lng;

    // Geocode address if coordinates not provided
    if (!lat || !lng) {
      if (!params.address) throw new BadRequestException('Provide lat/lng or address');
      const geo = await this.geocodeAddress(params.address, apiKey);
      lat = geo.lat;
      lng = geo.lng;
    }

    const radiusMeters = RADIUS_METERS[params.radius];
    const language = (params.language || 'en') as Language;

    try {
      const response = await this.mapsClient.placesNearby({
        params: {
          location: { lat, lng },
          radius: radiusMeters,
          type: PlaceType1.restaurant,
          language,
          key: apiKey,
        },
      });

      const places = response.data.results.map((p) => ({
        placeId: p.place_id,
        name: p.name,
        address: p.vicinity,
        location: p.geometry?.location,
        rating: p.rating ?? null,
        userRatingsTotal: p.user_ratings_total ?? null,
        priceLevel: p.price_level ?? null,
        openNow: p.opening_hours?.open_now ?? null,
        photos: (p.photos || []).slice(0, 3).map((ph) => ({
          photoReference: ph.photo_reference,
          width: ph.width,
          height: ph.height,
        })),
        distance: this.haversineDistance(lat!, lng!, p.geometry?.location.lat!, p.geometry?.location.lng!),
      }));

      // Sort by distance
      places.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

      return { places, searchCenter: { lat, lng }, radius: params.radius };
    } catch (err) {
      this.logger.error('Google Places Nearby Search failed', err);
      throw new BadRequestException('Failed to fetch nearby restaurants');
    }
  }

  async getPlaceDetails(placeId: string, language = 'en') {
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY');

    try {
      const response = await this.mapsClient.placeDetails({
        params: {
          place_id: placeId,
          language: language as Language,
          fields: [
            'place_id', 'name', 'formatted_address', 'geometry',
            'rating', 'user_ratings_total', 'price_level',
            'website', 'formatted_phone_number', 'opening_hours',
            'photos', 'types',
          ],
          key: apiKey!,
        },
      });

      const p = response.data.result;
      return {
        placeId: p.place_id,
        name: p.name,
        address: p.formatted_address,
        location: p.geometry?.location,
        rating: p.rating ?? null,
        userRatingsTotal: p.user_ratings_total ?? null,
        priceLevel: p.price_level ?? null,
        website: p.website ?? null,
        phone: p.formatted_phone_number ?? null,
        openingHours: p.opening_hours
          ? {
              openNow: p.opening_hours.open_now ?? false,
              weekdayText: p.opening_hours.weekday_text ?? [],
            }
          : null,
        photos: (p.photos || []).slice(0, 10).map((ph) => ({
          photoReference: ph.photo_reference,
          width: ph.width,
          height: ph.height,
        })),
        types: p.types ?? [],
      };
    } catch (err) {
      this.logger.error(`Failed to fetch place details for ${placeId}`, err);
      throw new BadRequestException('Failed to fetch restaurant details');
    }
  }

  getPhotoUrl(photoReference: string, maxWidth = 400): string {
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY');
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
  }

  private async geocodeAddress(address: string, apiKey: string) {
    const response = await this.mapsClient.geocode({
      params: { address, key: apiKey },
    });
    const location = response.data.results[0]?.geometry?.location;
    if (!location) throw new BadRequestException(`Could not geocode address: ${address}`);
    return location;
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
}
