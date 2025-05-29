// Common error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
    
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// HTTP Status Codes
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504
}

// Log Levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

// Environment Types
export enum Environment {
  DEVELOPMENT = 'development',
  TEST = 'test',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<T>;

// Generic response wrapper
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

// Date range type
export interface DateRange {
  start: Date;
  end: Date;
}

// Sort order
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

// Sort configuration
export interface SortConfig {
  field: string;
  order: SortOrder;
}

// Filter operators
export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  IN = 'in',
  NOT_IN = 'notIn',
  IS_NULL = 'isNull',
  IS_NOT_NULL = 'isNotNull'
}

// Generic filter
export interface Filter {
  field: string;
  operator: FilterOperator;
  value: any;
}

// Pagination info
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Generic paginated result
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo;
}

// File information
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  checksum?: string;
}

// Progress tracking
export interface Progress {
  current: number;
  total: number;
  percentage: number;
  message?: string;
  startTime: Date;
  estimatedCompletion?: Date;
}

// Configuration base
export interface BaseConfig {
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Cache configuration
export interface CacheConfig extends BaseConfig {
  ttl: number; // Time to live in seconds
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'fifo';
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

// Health check status
export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded'
}

// Service health
export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  responseTime?: number;
  lastCheck: Date;
  message?: string;
  metadata?: Record<string, any>;
}

// System health
export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  services: ServiceHealth[];
  metrics: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

// Event types
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  source: string;
  data: Record<string, any>;
}

// Webhook event
export interface WebhookEvent extends BaseEvent {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  response?: {
    statusCode: number;
    body: any;
    headers: Record<string, string>;
  };
}

// Job status
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Background job
export interface BackgroundJob {
  id: string;
  type: string;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  data: Record<string, any>;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  nextAttemptAt?: Date;
}

// Rate limit information
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  windowMs: number;
}

// API version information
export interface ApiVersion {
  version: string;
  deprecated: boolean;
  deprecationDate?: Date;
  supportedUntil?: Date;
  changelog?: string;
}

// Performance metrics
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number; // requests per second
  errorRate: number; // percentage
  availability: number; // percentage
  p50: number; // 50th percentile response time
  p95: number; // 95th percentile response time
  p99: number; // 99th percentile response time
  memoryUsage: number; // bytes
  cpuUsage: number; // percentage
}

// Security context
export interface SecurityContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  permissions: string[];
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  apiKey?: string;
}

// Audit event
export interface AuditEvent {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  result: 'success' | 'failure';
  error?: string;
}

// Feature flag
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  conditions?: Array<{
    field: string;
    operator: FilterOperator;
    value: any;
  }>;
  rolloutPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Notification types
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// Time series data point
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

// Aggregation types
export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  MEDIAN = 'median',
  PERCENTILE = 'percentile'
}

// Geographic coordinate
export interface Coordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
}

// Address information
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: Coordinate;
}

// Contact information
export interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
  address?: Address;
}

// Currency information
export interface Currency {
  code: string; // ISO 4217 currency code
  symbol: string;
  name: string;
  decimalPlaces: number;
}

// Money amount with currency
export interface Money {
  amount: number;
  currency: Currency;
}

// Language information
export interface Language {
  code: string; // ISO 639-1 language code
  name: string;
  nativeName: string;
  rtl: boolean; // right-to-left
}

// Timezone information
export interface Timezone {
  name: string; // IANA timezone name
  offset: number; // UTC offset in minutes
  abbreviation: string;
}

// Color information
export interface Color {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  name?: string;
}

// Image information
export interface ImageInfo extends FileInfo {
  width: number;
  height: number;
  format: string;
  colorSpace?: string;
  hasAlpha: boolean;
}

// Video information
export interface VideoInfo extends FileInfo {
  width: number;
  height: number;
  duration: number; // in seconds
  framerate: number;
  codec: string;
  bitrate: number;
}

// Audio information
export interface AudioInfo extends FileInfo {
  duration: number; // in seconds
  bitrate: number;
  sampleRate: number;
  channels: number;
  codec: string;
}

// Generic key-value pair
export interface KeyValuePair<T = any> {
  key: string;
  value: T;
}

// Environment variables type
export interface EnvironmentVariables {
  [key: string]: string | undefined;
}

// Configuration validation result
export interface ConfigValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

// Generic resource
export interface Resource {
  id: string;
  type: string;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Resource usage
export interface ResourceUsage {
  resource: Resource;
  used: number;
  total: number;
  percentage: number;
  unit: string;
  timestamp: Date;
}

// System limits
export interface SystemLimits {
  maxFileSize: number;
  maxRequestSize: number;
  maxConcurrentRequests: number;
  maxQueueSize: number;
  maxRetries: number;
  timeoutMs: number;
}

// Error context
export interface ErrorContext {
  operation: string;
  input?: any;
  stackTrace?: string;
  timestamp: Date;
  correlationId?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

// Validation constraint
export interface ValidationConstraint {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'url' | 'date' | 'custom';
  value?: any;
  message: string;
  customValidator?: (value: any) => boolean;
}

// Field validation
export interface FieldValidation {
  field: string;
  constraints: ValidationConstraint[];
  optional?: boolean;
}

// Schema validation
export interface SchemaValidation {
  name: string;
  version: string;
  fields: FieldValidation[];
  strict?: boolean; // Reject unknown fields
}

// Generic entity with timestamps
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version?: number; // For optimistic locking
}

// Soft delete support
export interface SoftDeletable {
  deletedAt?: Date;
  isDeleted: boolean;
}

// Audit trail support
export interface Auditable {
  createdBy?: string;
  updatedBy?: string;
  auditLog?: AuditEvent[];
}

// Tag support
export interface Taggable {
  tags: string[];
}

// Search result with highlighting
export interface SearchResult<T> {
  item: T;
  score: number;
  highlights?: Record<string, string[]>;
  explanation?: string;
}

// Batch operation result
export interface BatchResult<T> {
  successful: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}