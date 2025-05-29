import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { DocumentRepository } from '../repositories/DocumentRepository';
import { EntityRepository } from '../repositories/EntityRepository';
import { AppError } from '../types/common';
import { DocumentsQueryParams, EntitiesQueryParams } from '../types/api';
import { DocumentType, EntityType } from '@prisma/client';

export class DatabaseController extends BaseController {
  constructor(
    private documentRepository: DocumentRepository,
    private entityRepository: EntityRepository
  ) {
    super();
  }

  /**
   * Get documents with optional filtering and pagination
   */
  getDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const pagination = this.extractPaginationParams(req);
      const queryParams = req.query as DocumentsQueryParams;

      // Validate document type if provided
      if (queryParams.documentType && !Object.values(DocumentType).includes(queryParams.documentType)) {
        throw new AppError(
          `Invalid document type. Must be one of: ${Object.values(DocumentType).join(', ')}`,
          400
        );
      }

      const { documents, total } = await this.documentRepository.findManyWithPagination(
        queryParams,
        pagination
      );

      const totalPages = Math.ceil(total / pagination.limit);

      this.handlePaginatedSuccess(
        res,
        documents,
        {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages
        },
        'Documents retrieved successfully'
      );
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Get a single document by ID
   */
  getDocumentById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Document ID is required', 400);
      }

      const document = await this.documentRepository.findByIdWithEntities(id);

      if (!document) {
        throw new AppError('Document not found', 404);
      }

      this.handleSuccess(res, document, 'Document retrieved successfully');
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Update a document
   */
  updateDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        throw new AppError('Document ID is required', 400);
      }

      // Check if document exists
      const existingDocument = await this.documentRepository.findById(id);
      if (!existingDocument) {
        throw new AppError('Document not found', 404);
      }

      // Validate document type if provided
      if (updateData.documentType && !Object.values(DocumentType).includes(updateData.documentType)) {
        throw new AppError(
          `Invalid document type. Must be one of: ${Object.values(DocumentType).join(', ')}`,
          400
        );
      }

      const updatedDocument = await this.documentRepository.update(id, updateData);

      this.handleSuccess(res, updatedDocument, 'Document updated successfully');
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Delete a document
   */
  deleteDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Document ID is required', 400);
      }

      // Check if document exists
      const existingDocument = await this.documentRepository.findById(id);
      if (!existingDocument) {
        throw new AppError('Document not found', 404);
      }

      await this.documentRepository.delete(id);

      this.handleSuccess(res, null, 'Document deleted successfully');
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Get entities with optional filtering and pagination
   */
  getEntities = async (req: Request, res: Response): Promise<void> => {
    try {
      const pagination = this.extractPaginationParams(req);
      const queryParams = req.query as EntitiesQueryParams;

      // Validate entity type if provided
      if (queryParams.type && !Object.values(EntityType).includes(queryParams.type)) {
        throw new AppError(
          `Invalid entity type. Must be one of: ${Object.values(EntityType).join(', ')}`,
          400
        );
      }

      const { entities, total } = await this.entityRepository.findManyWithPagination(
        queryParams,
        pagination
      );

      const totalPages = Math.ceil(total / pagination.limit);

      this.handlePaginatedSuccess(
        res,
        entities,
        {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages
        },
        'Entities retrieved successfully'
      );
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Get a single entity by ID
   */
  getEntityById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Entity ID is required', 400);
      }

      const entity = await this.entityRepository.findByIdWithDocuments(id);

      if (!entity) {
        throw new AppError('Entity not found', 404);
      }

      this.handleSuccess(res, entity, 'Entity retrieved successfully');
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Get database statistics
   */
  getDatabaseStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const [
        totalDocuments,
        totalEntities,
        documentsByType,
        entitiesByType,
        recentDocuments
      ] = await Promise.all([
        this.documentRepository.count(),
        this.entityRepository.count(),
        this.documentRepository.countByType(),
        this.entityRepository.countByType(),
        this.documentRepository.findRecent(5)
      ]);

      const stats = {
        totals: {
          documents: totalDocuments,
          entities: totalEntities
        },
        distributions: {
          documentsByType,
          entitiesByType
        },
        recent: {
          documents: recentDocuments
        }
      };

      this.handleSuccess(res, stats, 'Database statistics retrieved successfully');
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Search across documents and entities
   */
  globalSearch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q: query } = req.query;
      const pagination = this.extractPaginationParams(req);

      if (!query || typeof query !== 'string') {
        throw new AppError('Search query is required', 400);
      }

      const searchTerm = query.trim();
      if (searchTerm.length < 2) {
        throw new AppError('Search query must be at least 2 characters long', 400);
      }

      const [documents, entities] = await Promise.all([
        this.documentRepository.search(searchTerm, pagination),
        this.entityRepository.search(searchTerm, pagination)
      ]);

      const results = {
        documents: documents.data,
        entities: entities.data,
        pagination: {
          documents: {
            total: documents.total,
            totalPages: Math.ceil(documents.total / pagination.limit)
          },
          entities: {
            total: entities.total,
            totalPages: Math.ceil(entities.total / pagination.limit)
          }
        }
      };

      this.handleSuccess(res, results, 'Search completed successfully');
    } catch (error) {
      this.handleError(res, error, req);
    }
  };
}