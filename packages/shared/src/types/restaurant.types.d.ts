export interface PlaceLocation {
    lat: number;
    lng: number;
}
export interface PlacePhoto {
    photoReference: string;
    width: number;
    height: number;
}
export interface PlaceOpeningHours {
    openNow: boolean;
    weekdayText?: string[];
}
export interface Restaurant {
    placeId: string;
    name: string;
    address: string;
    location: PlaceLocation;
    rating: number | null;
    userRatingsTotal: number | null;
    priceLevel: number | null;
    cuisine: string[];
    phone: string | null;
    website: string | null;
    openingHours: PlaceOpeningHours | null;
    photos: PlacePhoto[];
    distance: number | null;
}
export interface RestaurantDetails extends Restaurant {
    reviews: import('./review.types').Review[];
    appPhotos: import('./photo.types').Photo[];
    menuAvailable: boolean;
}
export type RadiusOption = 1 | 5 | 10 | 15;
export interface NearbySearchParams {
    lat?: number;
    lng?: number;
    address?: string;
    radius: RadiusOption;
    language?: string;
}
