"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_ROUTES = exports.PLACES_TYPES = exports.REVIEW_MAX_RATING = exports.REVIEW_MIN_RATING = exports.MAX_PHOTO_SIZE_MB = exports.MAX_PHOTOS_PER_UPLOAD = exports.MENU_CACHE_TTL_HOURS = exports.DEFAULT_LANGUAGE = exports.SUPPORTED_LANGUAGES = exports.RADIUS_METERS = exports.RADIUS_OPTIONS = void 0;
exports.RADIUS_OPTIONS = [1, 5, 10, 15];
exports.RADIUS_METERS = {
    1: 1000,
    5: 5000,
    10: 10000,
    15: 15000,
};
exports.SUPPORTED_LANGUAGES = [
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
];
exports.DEFAULT_LANGUAGE = 'en';
exports.MENU_CACHE_TTL_HOURS = 24;
exports.MAX_PHOTOS_PER_UPLOAD = 5;
exports.MAX_PHOTO_SIZE_MB = 10;
exports.REVIEW_MIN_RATING = 1;
exports.REVIEW_MAX_RATING = 5;
exports.PLACES_TYPES = ['restaurant', 'cafe', 'bakery', 'bar', 'food'];
exports.API_ROUTES = {
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
        DETAIL: (placeId) => `/places/${placeId}`,
    },
    MENU: {
        GET: (placeId) => `/menu/${placeId}`,
        STATUS: (jobId) => `/menu/status/${jobId}`,
    },
    ORDER: {
        GENERATE: '/order/generate',
    },
    TRANSLATION: {
        TRANSLATE: '/translation/translate',
    },
    REVIEWS: {
        BY_PLACE: (placeId) => `/reviews/${placeId}`,
        CREATE: '/reviews',
        UPDATE: (id) => `/reviews/${id}`,
        DELETE: (id) => `/reviews/${id}`,
    },
    PHOTOS: {
        BY_PLACE: (placeId) => `/photos/${placeId}`,
        UPLOAD: '/photos',
        DELETE: (id) => `/photos/${id}`,
    },
    ADMIN: {
        STATS: '/admin/stats',
        USERS: '/admin/users',
        REVIEWS: '/admin/reviews',
        PHOTOS: '/admin/photos',
        MENU_CACHE: '/admin/menu-cache',
    },
};
//# sourceMappingURL=index.js.map