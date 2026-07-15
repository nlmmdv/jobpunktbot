// Colors
export const COLORS = {
  // Primary
  primaryFreelancer: '#6D28D9',
  primaryFreelancerLight: '#7C3AED',
  primaryFreelancerDark: '#5B21B6',
  primaryOwner: '#2563EB',
  primaryOwnerDark: '#1D4ED8',

  // Backgrounds
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F7F6FB',
  bgTertiary: '#EDE4FB',
  bgAccent: '#F5F8FE',

  // Borders
  borderPrimary: '#ECEAF4',
  borderOwner: '#E1EBFB',
  borderSecondary: '#D4CAEB',

  // Text
  textPrimary: '#17151F',
  textSecondary: '#6E6A7C',
  textTertiary: '#8B8798',
  textHint: 'var(--tg-theme-hint-color)',

  // Status
  error: '#DC2626',
  success: '#10B981',
  warning: '#F59E0B',
};

// Cities
export const CITIES = {
  MOSCOW: 'Москва',
  SPB: 'Санкт-Петербург',
  OTHER: 'Другое',
  ALL: 'Все',
};

export const CITIES_LIST = [CITIES.MOSCOW, CITIES.SPB, CITIES.OTHER];
export const CITIES_WITH_ALL = [CITIES.MOSCOW, CITIES.SPB, CITIES.ALL];

// Marketplaces
export const MARKETPLACES = {
  WB: 'WB',
  OZON: 'Ozon',
  YANDEX: 'Яндекс Маркет',
};

export const MARKETPLACES_LIST = [MARKETPLACES.WB, MARKETPLACES.OZON, MARKETPLACES.YANDEX];

// Employment types
export const EMPLOYMENT_TYPES = {
  ALL: 'Все',
  PART_TIME: 'Подработка',
  FULL_TIME: 'Постоянная',
};

export const EMPLOYMENT_TYPES_LIST = [
  EMPLOYMENT_TYPES.ALL,
  EMPLOYMENT_TYPES.PART_TIME,
  EMPLOYMENT_TYPES.FULL_TIME,
];

// API Endpoints
export const API_ENDPOINTS = {
  BASE: 'https://tsicyeumkwvnfkryxfjl.supabase.co',
  SEARCH_FREELANCERS: 'search-freelancers',
  LIST_VACANCIES: 'list-vacancies',
  FREELANCER_RESUMES: 'freelancer-resumes',
  FREELANCER_SHIFTS: 'freelancer-shifts',
  OWNER_VACANCIES: 'owner-vacancies',
  APPLICATIONS: 'applications',
  JOB_MATCHES: 'job-matches',
  TG_AUTH: 'tg-auth',
  TG_REGISTER: 'tg-register',
  UPDATE_PROFILE: 'update-profile',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Ошибка сети. Проверьте подключение',
  SERVER_ERROR: 'Ошибка сервера. Попробуйте позже',
  VALIDATION_ERROR: 'Пожалуйста, проверьте введенные данные',
  AUTH_ERROR: 'Ошибка аутентификации',
  NOT_FOUND: 'Ничего не найдено',
};

// Validation
export const VALIDATION = {
  PHONE_LENGTH: 11,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,
};

// Button Colors
export const BUTTON_COLORS = {
  primary: COLORS.primaryFreelancer,
  primaryOwner: COLORS.primaryOwner,
  secondary: COLORS.bgSecondary,
};
