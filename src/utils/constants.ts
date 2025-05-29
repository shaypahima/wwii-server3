// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

// Cache Keys
export const CACHE_KEYS = {
  DOCUMENT: 'doc',
  ENTITY: 'entity',
  ANALYSIS: 'analysis', 
  IMAGE: 'image',
  DIRECTORY: 'dir_content',
  METADATA: 'metadata',
  SEARCH: 'search',
  STATS: 'stats'
} as const;

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400 // 24 hours
} as const;

// File Size Limits
export const FILE_SIZE_LIMITS = {
  MAX_UPLOAD_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024,  // 10MB
  MAX_PDF_SIZE: 100 * 1024 * 1024,   // 100MB
  MAX_DOC_SIZE: 50 * 1024 * 1024     // 50MB
} as const;

// Supported File Types
export const SUPPORTED_FILE_TYPES = {
  DOCUMENTS: ['pdf', 'doc', 'docx'],
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'],
  ALL: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff']
} as const;

// MIME Types
export const MIME_TYPES = {
  PDF: 'application/pdf',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  JPEG: 'image/jpeg',
  JPG: 'image/jpg',
  PNG: 'image/png',
  GIF: 'image/gif',
  BMP: 'image/bmp',
  TIFF: 'image/tiff',
  TXT: 'text/plain',
  JSON: 'application/json'
} as const;

// Validation Constants
export const VALIDATION_LIMITS = {
  MIN_TITLE_LENGTH: 1,
  MAX_TITLE_LENGTH: 255,
  MIN_CONTENT_LENGTH: 1,
  MAX_CONTENT_LENGTH: 10000,
  MIN_ENTITY_NAME_LENGTH: 1,
  MAX_ENTITY_NAME_LENGTH: 255,
  MAX_ENTITIES_PER_DOCUMENT: 50,
  MIN_SEARCH_QUERY_LENGTH: 2,
  MAX_SEARCH_QUERY_LENGTH: 100,
  MAX_PAGE_SIZE: 100,
  MAX_PAGE_NUMBER: 10000
} as const;

// Database Limits
export const DATABASE_LIMITS = {
  MAX_CONNECTIONS: 20,
  CONNECTION_TIMEOUT: 5000,
  QUERY_TIMEOUT: 30000,
  BATCH_SIZE: 100,
  MAX_TRANSACTION_TIMEOUT: 60000
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  },
  UPLOAD: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 10
  },
  ANALYSIS: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 5
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5
  }
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  DOCUMENTS: '/api/documents',
  ENTITIES: '/api/entities',
  ANALYSIS: '/api/analysis',
  SEARCH: '/api/search',
  UPLOAD: '/api/upload',
  AUTH: '/api/auth',
  HEALTH: '/api/health',
  STATS: '/api/stats'
} as const;

// Google Drive API
export const GOOGLE_DRIVE = {
  SCOPES: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ],
  API_VERSION: 'v3',
  MAX_RESULTS: 100,
  FOLDER_MIME_TYPE: 'application/vnd.google-apps.folder'
} as const;

// AI/ML Constants
export const AI_CONFIG = {
  DEFAULT_TEMPERATURE: 0.3,
  MAX_TOKENS: 1024,
  TOP_P: 0.9,
  MODEL_NAME: 'llama-vision-free',
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  CONFIDENCE_THRESHOLD: 0.7
} as const;

// Document Types (must match Prisma enum)
export const DOCUMENT_TYPES = {
  LETTER: 'letter',
  REPORT: 'report',
  PHOTO: 'photo',
  NEWSPAPER: 'newspaper',
  LIST: 'list',
  DIARY_ENTRY: 'diary_entry',
  BOOK: 'book',
  MAP: 'map',
  BIOGRAPHY: 'biography'
} as const;

// Entity Types (must match Prisma enum)
export const ENTITY_TYPES = {
  PERSON: 'person',
  LOCATION: 'location',
  ORGANIZATION: 'organization',
  EVENT: 'event',
  DATE: 'date',
  UNIT: 'unit'
} as const;

// Job Status
export const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

// Log Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly'
} as const;

// Environment Types
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  STAGING: 'staging',
  PRODUCTION: 'production'
} as const;

// Date Formats
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  DATE_ONLY: 'YYYY-MM-DD',
  DISPLAY: 'MMM DD, YYYY',
  LOG: 'YYYY-MM-DD HH:mm:ss'
} as const;

// Time Constants
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000
} as const;

// Regular Expressions
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  FILENAME: /^[a-zA-Z0-9._-]+$/,
  API_KEY: /^[a-zA-Z0-9_-]{20,}$/
} as const;

// Security Constants
export const SECURITY = {
  BCRYPT_ROUNDS: 12,
  JWT_EXPIRES_IN: '24h',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  PASSWORD_MIN_LENGTH: 8,
  API_KEY_LENGTH: 32,
  CORS_MAX_AGE: 86400, // 24 hours
  HELMET_CONFIG: {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }
} as const;

// Error Codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  FILE_SIZE_ERROR: 'FILE_SIZE_ERROR',
  FILE_TYPE_ERROR: 'FILE_TYPE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  DOCUMENT_CREATED: 'Document created successfully',
  DOCUMENT_UPDATED: 'Document updated successfully',
  DOCUMENT_DELETED: 'Document deleted successfully',
  ENTITY_CREATED: 'Entity created successfully',
  ENTITY_UPDATED: 'Entity updated successfully',
  ENTITY_DELETED: 'Entity deleted successfully',
  ANALYSIS_COMPLETED: 'Document analysis completed successfully',
  FILE_UPLOADED: 'File uploaded successfully',
  SEARCH_COMPLETED: 'Search completed successfully',
  CACHE_CLEARED: 'Cache cleared successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful'
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_REQUEST: 'Invalid request data',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  CONFLICT: 'Resource conflict',
  RATE_LIMITED: 'Too many requests',
  FILE_TOO_LARGE: 'File size exceeds limit',
  INVALID_FILE_TYPE: 'Unsupported file type',
  PROCESSING_FAILED: 'Processing failed',
  DATABASE_ERROR: 'Database operation failed',
  EXTERNAL_API_ERROR: 'External service unavailable',
  CACHE_ERROR: 'Cache operation failed',
  CONFIGURATION_ERROR: 'Configuration error',
  VALIDATION_FAILED: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error'
} as const;

// Health Check Status
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy',
  DEGRADED: 'degraded'
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
} as const;

// Service Names
export const SERVICES = {
  DATABASE: 'database',
  STORAGE: 'storage',
  AI: 'ai',
  CACHE: 'cache',
  VALIDATION: 'validation',
  DOCUMENT_PROCESSING: 'document_processing'
} as const;

// Image Processing Constants
export const IMAGE_CONFIG = {
  MAX_WIDTH: 2480,
  MAX_HEIGHT: 3508,
  DEFAULT_DPI: 300,
  QUALITY: 0.9,
  FORMAT: 'png',
  COMPRESSION: 0.8
} as const;

// OCR Configuration
export const OCR_CONFIG = {
  LANGUAGE: 'eng',
  PSM: 3, // Page segmentation mode
  OEM: 3, // OCR Engine mode
  CONFIDENCE_THRESHOLD: 60,
  TESSERACT_OPTIONS: {
    logger: true,
    corePath: '/tesseract-core.wasm.js'
  }
} as const;

// Export all constants as a single object for convenience
export const CONSTANTS = {
  HTTP_STATUS,
  CACHE_KEYS,
  CACHE_TTL,
  FILE_SIZE_LIMITS,
  SUPPORTED_FILE_TYPES,
  MIME_TYPES,
  VALIDATION_LIMITS,
  DATABASE_LIMITS,
  RATE_LIMITS,
  API_ENDPOINTS,
  GOOGLE_DRIVE,
  AI_CONFIG,
  DOCUMENT_TYPES,
  ENTITY_TYPES,
  JOB_STATUS,
  LOG_LEVELS,
  ENVIRONMENTS,
  DATE_FORMATS,
  TIME_CONSTANTS,
  REGEX_PATTERNS,
  SECURITY,
  ERROR_CODES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  HEALTH_STATUS,
  NOTIFICATION_TYPES,
  SERVICES,
  IMAGE_CONFIG,
  OCR_CONFIG
} as const;

export default CONSTANTS;