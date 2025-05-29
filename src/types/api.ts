import { DocumentType, EntityType } from '@prisma/client';
import type { DatabaseDocument, DatabaseEntity, Entity, ParsedAnalysis } from './database';

// Base API Response
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  statusCode?: number;
  timestamp: string;
  stack?: string;
}

// Paginated Response
export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

// Pagination Parameters
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

// Validation Result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Document Analysis
export interface AnalysisResult {
  analysis: ParsedAnalysis;
  image: string;
  fileName: string;
  fileId?: string;
  processedAt: string;
  savedDocument?: DatabaseDocument;
}

// Processing Status
export interface ProcessingStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: AnalysisResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Processing Options
export interface ProcessDocumentOptions {
  autoSave?: boolean;
  async?: boolean;
  forceRefresh?: boolean;
}

// Request Types
export interface CreateDocumentRequest {
  title: string;
  fileName: string;
  content: string;
  imageUrl?: string;
  documentType: DocumentType;
  entities: Entity[];
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  imageUrl?: string;
  documentType?: DocumentType;
  entities?: Entity[];
}

export interface AnalyzeDocumentRequest {
  forceRefresh?: boolean;
  includeImage?: boolean;
}

// Query Parameters
export interface DocumentsQueryParams {
  id?: string;
  keyword?: string;
  documentType?: DocumentType;
  entity?: string;
  startDate?: string;
  endDate?: string;
  page?: string;
  limit?: string;
}

export interface EntitiesQueryParams {
  id?: string;
  type?: EntityType;
  keyword?: string;
  entityType?: EntityType;
  date?: string;
  page?: string;
  limit?: string;
}

// Search Parameters
export interface SearchParams {
  q: string;
  type?: 'documents' | 'entities' | 'all';
  page?: number;
  limit?: number;
}

export interface SearchResults {
  documents: {
    data: DatabaseDocument[];
    total: number;
    totalPages: number;
  };
  entities: {
    data: DatabaseEntity[];
    total: number;
    totalPages: number;
  };
}

// Statistics
export interface DatabaseStats {
  totals: {
    documents: number;
    entities: number;
  };
  distributions: {
    documentsByType: Array<{ documentType: DocumentType; count: number }>;
    entitiesByType: Array<{ type: EntityType; count: number }>;
  };
  recent: {
    documents: DatabaseDocument[];
  };
}

export interface EntityStats {
  type: EntityType;
  count: number;
  documentsCount: number;
  averageDocumentsPerEntity: number;
}

// File Upload
export interface FileUploadResponse {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

// Bulk Operations
export interface BulkOperationRequest {
  ids: string[];
  action: 'delete' | 'update' | 'export';
  data?: any;
}

export interface BulkOperationResponse {
  totalRequested: number;
  successful: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

// Health Check
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: boolean;
    storage: boolean;
    ai: boolean;
  };
  version: string;
}

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  expiresIn: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  expiresIn: string;
}

// Cache
export interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  hits: number;
  misses: number;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Export/Import
export interface ExportRequest {
  format: 'json' | 'csv' | 'xlsx';
  filters?: DocumentsQueryParams | EntitiesQueryParams;
  includeEntities?: boolean;
}

export interface ExportResponse {
  downloadUrl: string;
  filename: string;
  format: string;
  recordCount: number;
  expiresAt: string;
}

// Webhook
export interface WebhookEvent {
  id: string;
  type: 'document.created' | 'document.updated' | 'document.deleted' | 'analysis.completed';
  data: any;
  timestamp: string;
}

// Analysis Configuration
export interface AnalysisConfig {
  aiModel: string;
  temperature: number;
  maxTokens: number;
  confidenceThreshold: number;
  extractionRules: {
    entities: {
      [key in EntityType]: {
        enabled: boolean;
        patterns?: string[];
        minConfidence?: number;
      };
    };
  };
}

// System Configuration
export interface SystemConfig {
  features: {
    fileUpload: boolean;
    bulkOperations: boolean;
    webhooks: boolean;
    analytics: boolean;
  };
  limits: {
    maxFileSize: number;
    maxEntitiesPerDocument: number;
    maxDocumentsPerUser: number;
    rateLimits: {
      analysis: number;
      upload: number;
      api: number;
    };
  };
  integrations: {
    googleDrive: boolean;
    dropbox: boolean;
    oneDrive: boolean;
  };
}

// Metrics and Analytics
export interface AnalyticsData {
  timeRange: {
    start: string;
    end: string;
  };
  metrics: {
    documentsProcessed: number;
    entitiesExtracted: number;
    avgProcessingTime: number;
    successRate: number;
  };
  trends: Array<{
    date: string;
    documents: number;
    entities: number;
    processingTime: number;
  }>;
}

// Notification
export interface NotificationConfig {
  email: {
    enabled: boolean;
    recipients: string[];
    events: string[];
  };
  webhook: {
    enabled: boolean;
    url: string;
    events: string[];
    secret?: string;
  };
}

// Backup and Restore
export interface BackupRequest {
  includeFiles: boolean;
  compression: boolean;
  encryption: boolean;
}

export interface BackupResponse {
  backupId: string;
  filename: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
  expiresAt: string;
}

export interface RestoreRequest {
  backupId: string;
  overwrite: boolean;
  validateOnly: boolean;
}

export interface RestoreResponse {
  status: 'success' | 'failed' | 'partial';
  documentsRestored: number;
  entitiesRestored: number;
  errors?: string[];
  warnings?: string[];
}