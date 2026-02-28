import type { RadiusOption } from '../types/restaurant.types';

export const RADIUS_OPTIONS: RadiusOption[] = [1, 5, 10, 15];

export const RADIUS_METERS: Record<RadiusOption, number> = {
  1: 1000,
  5: 5000,
  10: 10000,
  15: 15000,
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const MENU_CACHE_TTL_HOURS = 24;

export const MAX_PHOTOS_PER_UPLOAD = 5;
export const MAX_PHOTO_SIZE_MB = 10;

export const REVIEW_MIN_RATING = 1;
export const REVIEW_MAX_RATING = 5;

export const PLACES_TYPES = ['restaurant', 'cafe', 'bakery', 'bar', 'food'];

export const API_ROUTES = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    GOOGLE: '/auth/google',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  USERS: {
    ME: '/users/me',
    LIST: '/users',
  },
  PLACES: {
    NEARBY: '/places/nearby',
    SEARCH: '/places/search',
    DETAIL: (placeId: string) => `/places/${placeId}`,
  },
  MENU: {
    GET: (placeId: string) => `/menu/${placeId}`,
    STATUS: (jobId: string) => `/menu/status/${jobId}`,
  },
  ORDER: {
    GENERATE: '/order/generate',
  },
  TRANSLATION: {
    TRANSLATE: '/translation/translate',
  },
  REVIEWS: {
    BY_PLACE: (placeId: string) => `/reviews/${placeId}`,
    CREATE: '/reviews',
    UPDATE: (id: string) => `/reviews/${id}`,
    DELETE: (id: string) => `/reviews/${id}`,
  },
  PHOTOS: {
    BY_PLACE: (placeId: string) => `/photos/${placeId}`,
    UPLOAD: '/photos',
    DELETE: (id: string) => `/photos/${id}`,
  },
  ADMIN: {
    STATS: '/admin/stats',
    USERS: '/admin/users',
    REVIEWS: '/admin/reviews',
    PHOTOS: '/admin/photos',
    MENU_CACHE: '/admin/menu-cache',
  },
} as const;
