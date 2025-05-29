import { DocumentType, EntityType } from '@prisma/client';

// Base database types
export interface DatabaseDocument {
  id: string;
  title: string;
  fileName: string;
  content: string;
  imageUrl?: string | null;
  documentType: DocumentType;
  createdAt: Date;
  updatedAt: Date;
  entities: DatabaseEntity[];
}

export interface DatabaseEntity {
  id: string;
  name: string;
  date?: string | null;
  type: EntityType;
  documents?: DatabaseDocument[];
  _count?: {
    documents: number;
  };
}

// Entity for creation/processing
export interface Entity {
  id?: string;
  name: string;
  date?: string | null;
  type: EntityType;
  documents?: DatabaseDocument[];
}

// Document for creation/processing
export interface Document {
  id?: string;
  title: string;
  fileName: string;
  content: string;
  imageUrl?: string;
  documentType: DocumentType;
  createdAt?: Date;
  updatedAt?: Date;
  entities: Entity[];
}

// Parsed analysis from AI
export interface ParsedAnalysis {
  documentType: DocumentType;
  title: string;
  content: string;
  entities: Entity[];
}

// File handling
export interface File {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  data?: Buffer;
  modifiedTime?: string;
  createdTime?: string;
  parents?: string[];
}

export interface FileListItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  type: string;
  modifiedTime?: string;
  createdTime?: string;
  isFolder: boolean;
}

// Database connection and configuration
export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
  ssl?: boolean;
}

// Migration and schema
export interface MigrationInfo {
  id: string;
  name: string;
  applied: boolean;
  appliedAt?: Date;
  checksum: string;
}

export interface SchemaInfo {
  version: string;
  tables: string[];
  indexes: string[];
  constraints: string[];
}

// Query builders and filters
export interface DocumentFilter {
  id?: string;
  title?: string;
  fileName?: string;
  content?: string;
  documentType?: DocumentType;
  entityIds?: string[];
  entityNames?: string[];
  entityTypes?: EntityType[];
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
}

export interface EntityFilter {
  id?: string;
  name?: string;
  type?: EntityType;
  documentIds?: string[];
  hasDocuments?: boolean;
  dateAfter?: Date;
  dateBefore?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
}

// Aggregation results
export interface DocumentAggregation {
  totalCount: number;
  byType: Array<{
    type: DocumentType;
    count: number;
    percentage: number;
  }>;
  byMonth: Array<{
    month: string;
    count: number;
  }>;
  averageEntitiesPerDocument: number;
  mostCommonEntities: Array<{
    entityName: string;
    count: number;
  }>;
}

export interface EntityAggregation {
  totalCount: number;
  byType: Array<{
    type: EntityType;
    count: number;
    percentage: number;
  }>;
  mostLinkedEntities: Array<{
    entityName: string;
    documentCount: number;
  }>;
  averageDocumentsPerEntity: number;
  orphanedCount: number;
}

// Transaction handling
export interface TransactionOptions {
  timeout?: number;
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readOnly?: boolean;
}

export interface TransactionResult<T> {
  success: boolean;
  result?: T;
  error?: string;
  rollback?: boolean;
}

// Backup and recovery
export interface DatabaseBackup {
  id: string;
  filename: string;
  size: number;
  createdAt: Date;
  type: 'full' | 'incremental' | 'schema_only';
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  metadata: {
    documentsCount: number;
    entitiesCount: number;
    version: string;
  };
}

// Performance monitoring
export interface QueryPerformance {
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: Date;
  parameters?: any[];
}

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
  };
  queries: {
    totalExecuted: number;
    averageExecutionTime: number;
    slowQueries: QueryPerformance[];
  };
  storage: {
    totalSize: number;
    dataSize: number;
    indexSize: number;
    freeSpace: number;
  };
  performance: {
    cacheHitRatio: number;
    deadlocks: number;
    blockedQueries: number;
  };
}

// Search and indexing
export interface SearchIndex {
  name: string;
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'fulltext';
  unique: boolean;
  size: number;
  usage: {
    scans: number;
    tupleReads: number;
    tupleFetches: number;
  };
}

export interface FullTextSearchConfig {
  language: string;
  weights: {
    title: number;
    content: number;
    entityNames: number;
  };
  ranking: 'ts_rank' | 'ts_rank_cd';
  minScore: number;
}

// Data validation and constraints
export interface ValidationRule {
  field: string;
  type: 'required' | 'length' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface DatabaseConstraint {
  name: string;
  table: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'SET DEFAULT';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'SET DEFAULT';
}

// Audit and logging
export interface AuditLog {
  id: string;
  table: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId?: string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}

// Data import/export
export interface ImportConfig {
  format: 'json' | 'csv' | 'xlsx';
  mapping: Record<string, string>;
  validation: ValidationRule[];
  options: {
    skipDuplicates: boolean;
    updateExisting: boolean;
    batchSize: number;
  };
}

export interface ExportConfig {
  format: 'json' | 'csv' | 'xlsx';
  fields: string[];
  filters: DocumentFilter | EntityFilter;
  options: {
    includeRelations: boolean;
    flattenRelations: boolean;
    dateFormat: string;
  };
}

// Synchronization
export interface SyncConfig {
  source: string;
  target: string;
  direction: 'push' | 'pull' | 'bidirectional';
  schedule: string; // cron expression
  conflictResolution: 'source_wins' | 'target_wins' | 'manual' | 'merge';
  filters?: {
    documents?: DocumentFilter;
    entities?: EntityFilter;
  };
}

export interface SyncResult {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  summary: {
    documentsProcessed: number;
    entitiesProcessed: number;
    conflicts: number;
    errors: number;
  };
  logs: Array<{
    level: 'info' | 'warn' | 'error';
    message: string;
    timestamp: Date;
  }>;
}