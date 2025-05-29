import { Request, Response, NextFunction } from 'express';
import { DocumentType, EntityType } from '@prisma/client';
import { AppError } from '../types/common';
import { ApiResponse } from '../types/api';
import config from '../config/environment';

/**
 * Validate file ID parameter
 */
export const validateFileId = (req: Request, res: Response, next: NextFunction) => {
  const { fileId } = req.params;
  
  if (!fileId || typeof fileId !== 'string' || fileId.trim().length === 0) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Valid file ID is required',
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  // Basic format validation (Google Drive file IDs are typically 33-44 characters)
  if (fileId.length < 10 || fileId.length > 100) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid file ID format',
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  next();
};

/**
 * Validate document ID parameter
 */
export const validateDocumentId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Valid document ID is required',
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  next();
};

/**
 * Validate entity ID parameter
 */
export const validateEntityId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Valid entity ID is required',
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  next();
};

/**
 * Validate pagination query parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const { page, limit } = req.query;
  
  if (page !== undefined) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Page must be a positive integer',
        statusCode: 400,
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }
    
    if (pageNum > 10000) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Page number cannot exceed 10,000',
        statusCode: 400,
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }
  }
  
  if (limit !== undefined) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Limit must be a positive integer',
        statusCode: 400,
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }
    
    if (limitNum > 100) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Limit cannot exceed 100',
        statusCode: 400,
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }
  }
  
  next();
};

/**
 * Validate search query parameter
 */
export const validateSearchQuery = (req: Request, res: Response, next: NextFunction) => {
  const { q: query } = req.query;
  
  if (!query || typeof query !== 'string') {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Search query is required',
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  const searchTerm = query.trim();
  if (searchTerm.length < 2) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Search query must be at least 2 characters long',
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  if (searchTerm.length > 100) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Search query cannot exceed 100 characters',
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  // Check for potentially harmful characters
  const dangerousChars = /[<>{}[\]]/;
  if (dangerousChars.test(searchTerm)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Search query contains invalid characters',
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  next();
};

/**
 * Validate document type query parameter
 */
export const validateDocumentType = (req: Request, res: Response, next: NextFunction) => {
  const { documentType } = req.query;
  
  if (documentType && !Object.values(DocumentType).includes(documentType as DocumentType)) {
    const response: ApiResponse<null> = {
      success: false,
      error: `Invalid document type. Must be one of: ${Object.values(DocumentType).join(', ')}`,
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  next();
};

/**
 * Validate entity type query parameter
 */
export const validateEntityType = (req: Request, res: Response, next: NextFunction) => {
  const { type, entityType } = req.query;
  const typeToValidate = type || entityType;
  
  if (typeToValidate && !Object.values(EntityType).includes(typeToValidate as EntityType)) {
    const response: ApiResponse<null> = {
      success: false,
      error: `Invalid entity type. Must be one of: ${Object.values(EntityType).join(', ')}`,
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  next();
};

/**
 * Validate document creation request body
 */
export const validateDocumentBody = (req: Request, res: Response, next: NextFunction) => {
  const { title, fileName, content, documentType, entities } = req.body;
  const errors: string[] = [];
  
  // Required field validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  } else if (title.length > 255) {
    errors.push('Title cannot exceed 255 characters');
  }
  
  if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
    errors.push('File name is required and must be a non-empty string');
  } else if (fileName.length > 255) {
    errors.push('File name cannot exceed 255 characters');
  }
  
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    errors.push('Content is required and must be a non-empty string');
  } else if (content.length > 10000) {
    errors.push('Content cannot exceed 10,000 characters');
  }
  
  if (!documentType || !Object.values(DocumentType).includes(documentType)) {
    errors.push(`Document type is required and must be one of: ${Object.values(DocumentType).join(', ')}`);
  }
  
  // Entities validation
  if (!entities || !Array.isArray(entities)) {
    errors.push('Entities must be an array');
  } else if (entities.length === 0) {
    errors.push('At least one entity is required');
  } else if (entities.length > 50) {
    errors.push('Cannot have more than 50 entities per document');
  } else {
    entities.forEach((entity, index) => {
      if (!entity.name || typeof entity.name !== 'string' || entity.name.trim().length === 0) {
        errors.push(`Entity ${index + 1}: name is required and must be a non-empty string`);
      } else if (entity.name.length > 255) {
        errors.push(`Entity ${index + 1}: name cannot exceed 255 characters`);
      }
      
      if (!entity.type || !Object.values(EntityType).includes(entity.type)) {
        errors.push(`Entity ${index + 1}: type must be one of: ${Object.values(EntityType).join(', ')}`);
      }
      
      // Date entity specific validation
      if (entity.type === EntityType.date && entity.name) {
        const date = new Date(entity.name);
        if (isNaN(date.getTime())) {
          errors.push(`Entity ${index + 1}: invalid date format`);
        }
      }
    });
  }
  
  if (errors.length > 0) {
    const response: ApiResponse<null> = {
      success: false,
      error: `Validation failed: ${errors.join('; ')}`,
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  next();
};

/**
 * Validate file upload
 */
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'File is required',
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  const file = req.file;
  const errors: string[] = [];
  
  // File size validation
  const maxSize = parseSize(config.MAX_FILE_SIZE);
  if (file.size > maxSize) {
    errors.push(`File size ${formatBytes(file.size)} exceeds maximum allowed size ${config.MAX_FILE_SIZE}`);
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
  
  if (errors.length > 0) {
    const response: ApiResponse<null> = {
      success: false,
      error: `File validation failed: ${errors.join('; ')}`,
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  next();
};

/**
 * Validate bulk operation request body
 */
export const validateBulkOperation = (maxCount = 50) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { ids } = req.body;
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
    
    if (errors.length > 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Bulk operation validation failed: ${errors.join('; ')}`,
        statusCode: 400,
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }
    
    next();
  };
};

/**
 * Helper: Parse size string (e.g., "50mb") to bytes
 */
function parseSize(sizeStr: string): number {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmgt]?b)$/);
  
  if (!match) return 0;
  
  const [, size, unit] = match;
  return Math.floor(parseFloat(size) * (units[unit as keyof typeof units] || 1));
}

/**
 * Helper: Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}