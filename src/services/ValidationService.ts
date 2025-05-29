import { DocumentType, EntityType } from '@prisma/client';
import { CreateDocumentRequest, ValidationResult } from '../types/api';
import { Entity } from '../types/database';
import { DocumentRepository } from '../repositories/DocumentRepository';
import logger from '../utils/logger';
import config from '../config/environment';

export class ValidationService {
  constructor(private documentRepository: DocumentRepository) {}

  /**
   * Validate document data for saving
   */
  validateDocumentForSave(document: CreateDocumentRequest): ValidationResult {
    const errors: string[] = [];

    try {
      // Required field validation
      if (!document.title?.trim()) {
        errors.push('Title is required and cannot be empty');
      } else if (document.title.length > 255) {
        errors.push('Title cannot exceed 255 characters');
      }

      if (!document.fileName?.trim()) {
        errors.push('File name is required and cannot be empty');
      } else if (document.fileName.length > 255) {
        errors.push('File name cannot exceed 255 characters');
      }

      if (!document.content?.trim()) {
        errors.push('Content is required and cannot be empty');
      } else if (document.content.length > 10000) {
        errors.push('Content cannot exceed 10,000 characters');
      }

      // Document type validation
      if (!document.documentType) {
        errors.push('Document type is required');
      } else if (!Object.values(DocumentType).includes(document.documentType)) {
        errors.push(`Invalid document type. Must be one of: ${Object.values(DocumentType).join(', ')}`);
      }

      // Image URL validation (optional)
      if (document.imageUrl && !this.isValidUrl(document.imageUrl)) {
        errors.push('Invalid image URL format');
      }

      // Entities validation
      if (!document.entities || !Array.isArray(document.entities)) {
        errors.push('Entities must be an array');
      } else {
        const entityValidation = this.validateEntities(document.entities);
        if (!entityValidation.isValid) {
          errors.push(...entityValidation.errors);
        }
      }

      // Business logic validation
      if (document.documentType === DocumentType.photo && !document.imageUrl) {
        errors.push('Photo documents must have an image URL');
      }

      logger.debug(`Document validation completed with ${errors.length} errors`);

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      logger.error('Document validation failed:', error);
      return {
        isValid: false,
        errors: ['Validation process failed: ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }

  /**
   * Validate entities array
   */
  validateEntities(entities: Entity[]): ValidationResult {
    const errors: string[] = [];

    if (entities.length === 0) {
      errors.push('At least one entity is required');
      return { isValid: false, errors };
    }

    if (entities.length > 50) {
      errors.push('Cannot have more than 50 entities per document');
    }

    entities.forEach((entity, index) => {
      const entityValidation = this.validateEntity(entity);
      if (!entityValidation.isValid) {
        entityValidation.errors.forEach(error => {
          errors.push(`Entity ${index + 1}: ${error}`);
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate single entity
   */
  validateEntity(entity: Entity): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (!entity.name?.trim()) {
      errors.push('Entity name is required and cannot be empty');
    } else if (entity.name.length > 255) {
      errors.push('Entity name cannot exceed 255 characters');
    }

    // Type validation
    if (!entity.type) {
      errors.push('Entity type is required');
    } else if (!Object.values(EntityType).includes(entity.type)) {
      errors.push(`Invalid entity type. Must be one of: ${Object.values(EntityType).join(', ')}`);
    }

    // Type-specific validation
    if (entity.type === EntityType.date) {
      if (!entity.name) {
        errors.push('Date entity must have a name (date value)');
      } else {
        const date = new Date(entity.name);
        if (isNaN(date.getTime())) {
          errors.push('Invalid date format. Use YYYY-MM-DD or valid date string');
        } else {
          // Check if date is reasonable (between 1800 and current year + 10)
          const year = date.getFullYear();
          const currentYear = new Date().getFullYear();
          if (year < 1800 || year > currentYear + 10) {
            errors.push(`Date year must be between 1800 and ${currentYear + 10}`);
          }
        }
      }
    }

    if (entity.type === EntityType.person) {
      if (entity.name && entity.name.length < 2) {
        errors.push('Person name must be at least 2 characters long');
      }
    }

    if (entity.type === EntityType.location) {
      if (entity.name && entity.name.length < 2) {
        errors.push('Location name must be at least 2 characters long');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file upload
   */
  validateFileUpload(file: Express.Multer.File): ValidationResult {
    const errors: string[] = [];

    // File size validation
    const maxSize = this.parseSize(config.MAX_FILE_SIZE);
    if (file.size > maxSize) {
      errors.push(`File size ${this.formatBytes(file.size)} exceeds maximum allowed size ${config.MAX_FILE_SIZE}`);
    }

    // File type validation
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    if (!fileExtension || !config.ALLOWED_FILE_TYPES.includes(fileExtension)) {
      errors.push(`File type '${fileExtension}' is not allowed. Allowed types: ${config.ALLOWED_FILE_TYPES.join(', ')}`);
    }

    // MIME type validation
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`MIME type '${file.mimetype}' is not allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate search query
   */
  validateSearchQuery(query: string): ValidationResult {
    const errors: string[] = [];

    if (!query?.trim()) {
      errors.push('Search query is required');
    } else if (query.length < 2) {
      errors.push('Search query must be at least 2 characters long');
    } else if (query.length > 100) {
      errors.push('Search query cannot exceed 100 characters');
    }

    // Check for potentially harmful characters
    const dangerousChars = /[<>{}[\]]/;
    if (dangerousChars.test(query)) {
      errors.push('Search query contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(page?: string, limit?: string): ValidationResult {
    const errors: string[] = [];

    if (page !== undefined) {
      const pageNum = parseInt(page, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push('Page must be a positive integer');
      } else if (pageNum > 10000) {
        errors.push('Page number cannot exceed 10,000');
      }
    }

    if (limit !== undefined) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        errors.push('Limit must be a positive integer');
      } else if (limitNum > 100) {
        errors.push('Limit cannot exceed 100');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate document uniqueness
   */
  async validateDocumentUniqueness(title: string, fileName: string, excludeId?: string): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      const existingDocument = await this.documentRepository.findByTitleOrFilename(title, fileName);
      
      if (existingDocument && existingDocument.id !== excludeId) {
        if (existingDocument.title.toLowerCase() === title.toLowerCase()) {
          errors.push('A document with this title already exists');
        }
        if (existingDocument.fileName.toLowerCase() === fileName.toLowerCase()) {
          errors.push('A document with this filename already exists');
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      logger.error('Document uniqueness validation failed:', error);
      return {
        isValid: false,
        errors: ['Failed to validate document uniqueness']
      };
    }
  }

  /**
   * Validate API key or token
   */
  validateApiKey(apiKey: string): ValidationResult {
    const errors: string[] = [];

    if (!apiKey?.trim()) {
      errors.push('API key is required');
    } else if (apiKey.length < 10) {
      errors.push('API key is too short');
    } else if (apiKey.length > 200) {
      errors.push('API key is too long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate bulk operation
   */
  validateBulkOperation(ids: string[], maxCount = 50): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(ids)) {
      errors.push('IDs must be provided as an array');
    } else if (ids.length === 0) {
      errors.push('At least one ID is required');
    } else if (ids.length > maxCount) {
      errors.push(`Cannot process more than ${maxCount} items at once`);
    } else {
      // Validate each ID
      ids.forEach((id, index) => {
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
          errors.push(`Invalid ID at position ${index + 1}`);
        }
      });

      // Check for duplicates
      const uniqueIds = new Set(ids);
      if (uniqueIds.size !== ids.length) {
        errors.push('Duplicate IDs are not allowed');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Helper: Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Parse size string (e.g., "50mb") to bytes
   */
  private parseSize(sizeStr: string): number {
    const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
    const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmgt]?b)$/);
    
    if (!match) return 0;
    
    const [, size, unit] = match;
    return Math.floor(parseFloat(size) * (units[unit as keyof typeof units] || 1));
  }

  /**
   * Helper: Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}