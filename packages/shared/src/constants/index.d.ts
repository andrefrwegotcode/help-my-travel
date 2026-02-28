import type { RadiusOption } from '../types/restaurant.types';
export declare const RADIUS_OPTIONS: RadiusOption[];
export declare const RADIUS_METERS: Record<RadiusOption, number>;
export declare const SUPPORTED_LANGUAGES: readonly [{
    readonly code: "en";
    readonly name: "English";
    readonly nativeName: "English";
    readonly flag: "🇺🇸";
}, {
    readonly code: "pt";
    readonly name: "Portuguese";
    readonly nativeName: "Português";
    readonly flag: "🇧🇷";
}, {
    readonly code: "es";
    readonly name: "Spanish";
    readonly nativeName: "Español";
    readonly flag: "🇪🇸";
}, {
    readonly code: "fr";
    readonly name: "French";
    readonly nativeName: "Français";
    readonly flag: "🇫🇷";
}, {
    readonly code: "de";
    readonly name: "German";
    readonly nativeName: "Deutsch";
    readonly flag: "🇩🇪";
}, {
    readonly code: "it";
    readonly name: "Italian";
    readonly nativeName: "Italiano";
    readonly flag: "🇮🇹";
}, {
    readonly code: "ja";
    readonly name: "Japanese";
    readonly nativeName: "日本語";
    readonly flag: "🇯🇵";
}, {
    readonly code: "zh";
    readonly name: "Chinese";
    readonly nativeName: "中文";
    readonly flag: "🇨🇳";
}, {
    readonly code: "ko";
    readonly name: "Korean";
    readonly nativeName: "한국어";
    readonly flag: "🇰🇷";
}, {
    readonly code: "ar";
    readonly name: "Arabic";
    readonly nativeName: "العربية";
    readonly flag: "🇸🇦";
}, {
    readonly code: "ru";
    readonly name: "Russian";
    readonly nativeName: "Русский";
    readonly flag: "🇷🇺";
}, {
    readonly code: "nl";
    readonly name: "Dutch";
    readonly nativeName: "Nederlands";
    readonly flag: "🇳🇱";
}, {
    readonly code: "pl";
    readonly name: "Polish";
    readonly nativeName: "Polski";
    readonly flag: "🇵🇱";
}, {
    readonly code: "tr";
    readonly name: "Turkish";
    readonly nativeName: "Türkçe";
    readonly flag: "🇹🇷";
}];
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
export declare const DEFAULT_LANGUAGE: LanguageCode;
export declare const MENU_CACHE_TTL_HOURS = 24;
export declare const MAX_PHOTOS_PER_UPLOAD = 5;
export declare const MAX_PHOTO_SIZE_MB = 10;
export declare const REVIEW_MIN_RATING = 1;
export declare const REVIEW_MAX_RATING = 5;
export declare const PLACES_TYPES: string[];
export declare const API_ROUTES: {
    readonly AUTH: {
        readonly REGISTER: "/auth/register";
        readonly LOGIN: "/auth/login";
        readonly GOOGLE: "/auth/google";
        readonly FORGOT_PASSWORD: "/auth/forgot-password";
        readonly RESET_PASSWORD: "/auth/reset-password";
        readonly REFRESH: "/auth/refresh";
        readonly LOGOUT: "/auth/logout";
    };
    readonly USERS: {
        readonly ME: "/users/me";
        readonly LIST: "/users";
    };
    readonly PLACES: {
        readonly NEARBY: "/places/nearby";
        readonly SEARCH: "/places/search";
        readonly DETAIL: (placeId: string) => string;
    };
    readonly MENU: {
        readonly GET: (placeId: string) => string;
        readonly STATUS: (jobId: string) => string;
    };
    readonly ORDER: {
        readonly GENERATE: "/order/generate";
    };
    readonly TRANSLATION: {
        readonly TRANSLATE: "/translation/translate";
    };
    readonly REVIEWS: {
        readonly BY_PLACE: (placeId: string) => string;
        readonly CREATE: "/reviews";
        readonly UPDATE: (id: string) => string;
        readonly DELETE: (id: string) => string;
    };
    readonly PHOTOS: {
        readonly BY_PLACE: (placeId: string) => string;
        readonly UPLOAD: "/photos";
        readonly DELETE: (id: string) => string;
    };
    readonly ADMIN: {
        readonly STATS: "/admin/stats";
        readonly USERS: "/admin/users";
        readonly REVIEWS: "/admin/reviews";
        readonly PHOTOS: "/admin/photos";
        readonly MENU_CACHE: "/admin/menu-cache";
    };
};
