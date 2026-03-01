import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
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
      // Search multiple food-related place types in parallel to catch
      // pizzerias, cafés, bars, bakeries etc. that aren't typed as "restaurant"
      const foodTypes = [
        PlaceType1.restaurant,
        PlaceType1.cafe,
        PlaceType1.bar,
        PlaceType1.bakery,
        PlaceType1.meal_delivery,
        PlaceType1.meal_takeaway,
      ];

      const results = await Promise.allSettled(
        foodTypes.map((type) =>
          this.mapsClient.placesNearby({
            params: {
              location: { lat, lng },
              radius: radiusMeters,
              type,
              language,
              key: apiKey,
            },
          }),
        ),
      );

      // Merge and deduplicate by placeId
      const seen = new Set<string>();
      const places: any[] = [];

      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        for (const p of result.value.data.results) {
          if (!p.place_id || seen.has(p.place_id)) continue;
          seen.add(p.place_id);
          places.push({
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
          });
        }
      }

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
            'website', 'url', 'formatted_phone_number', 'opening_hours',
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
        googleMapsUrl: p.url ?? null,
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

  /**
   * Fetch extra photos via Places API v1 (New).
   * The v1 API may return different/additional photos compared to the legacy API,
   * increasing the chance of finding menu photos for OCR.
   */
  async getPlacePhotosV1(placeId: string): Promise<Array<{ name: string; widthPx: number; heightPx: number }>> {
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY');
    if (!apiKey) return [];

    try {
      const res = await axios.get(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'photos',
          },
          timeout: 8000,
        },
      );

      const photos = (res.data?.photos || []).map((p: any) => ({
        name: p.name,
        widthPx: p.widthPx || 0,
        heightPx: p.heightPx || 0,
      }));
      this.logger.log(`Places API v1 returned ${photos.length} photos for ${placeId}`);
      return photos;
    } catch (err) {
      this.logger.warn(`Failed to fetch Places API v1 photos: ${err}`);
      return [];
    }
  }

  /**
   * Get a photo URL from Places API v1 (New) using the photo resource name.
   */
  getPhotoUrlV1(photoName: string, maxWidthPx = 1200): string {
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY');
    return `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=${maxWidthPx}`;
  }

  /**
   * Try to scrape the Google Maps page for a place to find the menu URL.
   * Google Maps shows a "Menu" link for restaurants that is not available via API.
   */
  async scrapeGoogleMapsMenuLink(googleMapsUrl: string): Promise<string | null> {
    if (!googleMapsUrl) return null;

    try {
      const res = await axios.get(googleMapsUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        maxRedirects: 5,
      });

      const html = res.data;
      if (!html || typeof html !== 'string') return null;

      // Google Maps embeds menu URLs in the page source
      // Look for patterns like "menu":"https://..." or menu-related URLs
      const menuPatterns = [
        // JSON-embedded menu URL
        /"menu(?:_url|Url|_link|Link)?"\s*:\s*"(https?:\/\/[^"]+)"/i,
        // Direct menu link in HTML
        /href="(https?:\/\/[^"]*menu[^"]*)"/i,
        // Google redirect URL containing menu
        /url=(https?(?:%3A|:)(?:%2F|\/){2}[^&"]*menu[^&"]*)/i,
        // Data attribute with menu URL
        /data-url="(https?:\/\/[^"]*menu[^"]*)"/i,
      ];

      for (const pattern of menuPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          let url = match[1];
          // Decode URL-encoded characters
          url = decodeURIComponent(url);
          // Skip Google internal URLs
          if (url.includes('google.com/maps') || url.includes('google.com/search')) continue;
          this.logger.log(`Found menu URL via Google Maps scraping: ${url}`);
          return url;
        }
      }

      return null;
    } catch (err) {
      this.logger.warn(`Failed to scrape Google Maps page: ${err}`);
      return null;
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
