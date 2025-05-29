import { DocumentType, PrismaClient } from '@prisma/client';
import { BaseRepository, PaginatedResult } from './BaseRepository';
import { prisma } from '../config/database';
import { DatabaseDocument } from '../types/database';
import { DocumentsQueryParams, PaginationParams } from '../types/api';
import { logger } from '../utils/logger';
import { AppError } from '../types/common';

export class DocumentRepository extends BaseRepository<DatabaseDocument> {
  constructor() {
    super(prisma.document, 'document');
  }

  /**
   * Find document by title or filename
   */
  async findByTitleOrFilename(title: string, fileName: string, tx?: PrismaClient): Promise<DatabaseDocument | null> {
    try {
      const client = tx || prisma;
      const result = await client.document.findFirst({
        where: {
          OR: [
            { title: { equals: title, mode: 'insensitive' } },
            { fileName: { equals: fileName, mode: 'insensitive' } }
          ]
        },
        include: {
          entities: true
        }
      });

      return result as DatabaseDocument;
    } catch (error) {
      logger.error('Failed to find document by title or filename:', error);
      throw new AppError('Failed to find document');
    }
  }

  /**
   * Find document by ID with entities
   */
  async findByIdWithEntities(id: string, tx?: PrismaClient): Promise<DatabaseDocument | null> {
    try {
      const client = tx || prisma;
      const result = await client.document.findUnique({
        where: { id },
        include: {
          entities: true
        }
      });

      return result as DatabaseDocument;
    } catch (error) {
      logger.error(`Failed to find document with entities by ID ${id}:`, error);
      throw new AppError('Failed to find document');
    }
  }

  /**
   * Find documents with pagination and filtering
   */
  async findManyWithPagination(
    queryParams: DocumentsQueryParams,
    pagination: PaginationParams,
    tx?: PrismaClient
  ): Promise<PaginatedResult<DatabaseDocument>> {
    try {
      const client = tx || prisma;
      const where = this.buildWhereClause(queryParams);

      const [documents, total] = await Promise.all([
        client.document.findMany({
          where,
          skip: pagination.skip,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            entities: true
          }
        }),
        client.document.count({ where })
      ]);

      return {
        data: documents as DatabaseDocument[],
        total
      };
    } catch (error) {
      logger.error('Failed to find documents with pagination:', error);
      throw new AppError('Failed to find documents');
    }
  }

  /**
   * Search documents by content or title
   */
  async search(
    searchTerm: string,
    pagination: PaginationParams,
    tx?: PrismaClient
  ): Promise<PaginatedResult<DatabaseDocument>> {
    try {
      const client = tx || prisma;
      const where = {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { content: { contains: searchTerm, mode: 'insensitive' } },
          { fileName: { contains: searchTerm, mode: 'insensitive' } }
        ]
      };

      const [documents, total] = await Promise.all([
        client.document.findMany({
          where,
          skip: pagination.skip,
          take: pagination.limit,
          orderBy: [
            { _relevance: { fields: ['title', 'content'], search: searchTerm, sort: 'desc' } },
            { createdAt: 'desc' }
          ],
          include: {
            entities: true
          }
        }),
        client.document.count({ where })
      ]);

      return {
        data: documents as DatabaseDocument[],
        total
      };
    } catch (error) {
      logger.error('Failed to search documents:', error);
      // Fallback to simple search if full-text search fails
      return this.simpleSearch(searchTerm, pagination, tx);
    }
  }

  /**
   * Simple search fallback (without full-text search)
   */
  private async simpleSearch(
    searchTerm: string,
    pagination: PaginationParams,
    tx?: PrismaClient
  ): Promise<PaginatedResult<DatabaseDocument>> {
    const client = tx || prisma;
    const where = {
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { content: { contains: searchTerm, mode: 'insensitive' } },
        { fileName: { contains: searchTerm, mode: 'insensitive' } }
      ]
    };

    const [documents, total] = await Promise.all([
      client.document.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          entities: true
        }
      }),
      client.document.count({ where })
    ]);

    return {
      data: documents as DatabaseDocument[],
      total
    };
  }

  /**
   * Find documents by entity ID
   */
  async findByEntityId(entityId: string, pagination?: PaginationParams, tx?: PrismaClient): Promise<PaginatedResult<DatabaseDocument>> {
    try {
      const client = tx || prisma;
      const where = {
        entities: {
          some: { id: entityId }
        }
      };

      const queryOptions: any = {
        where,
        include: { entities: true },
        orderBy: { createdAt: 'desc' }
      };

      if (pagination) {
        queryOptions.skip = pagination.skip;
        queryOptions.take = pagination.limit;
      }

      const [documents, total] = await Promise.all([
        client.document.findMany(queryOptions),
        client.document.count({ where })
      ]);

      return {
        data: documents as DatabaseDocument[],
        total
      };
    } catch (error) {
      logger.error(`Failed to find documents by entity ID ${entityId}:`, error);
      throw new AppError('Failed to find documents');
    }
  }

  /**
   * Create document with entities
   */
  async createWithEntities(
    documentData: {
      title: string;
      fileName: string;
      content: string;
      imageUrl?: string;
      documentType: DocumentType;
    },
    entityIds: string[],
    tx?: PrismaClient
  ): Promise<DatabaseDocument> {
    try {
      const client = tx || prisma;
      const result = await client.document.create({
        data: {
          ...documentData,
          entities: {
            connect: entityIds.map(id => ({ id }))
          }
        },
        include: {
          entities: true
        }
      });

      logger.debug(`Created document with entities: ${result.id}`);
      return result as DatabaseDocument;
    } catch (error) {
      logger.error('Failed to create document with entities:', error);
      throw new AppError('Failed to create document');
    }
  }

  /**
   * Update document entities
   */
  async updateEntities(documentId: string, entityIds: string[], tx?: PrismaClient): Promise<DatabaseDocument> {
    try {
      const client = tx || prisma;
      
      // First disconnect all current entities
      await client.document.update({
        where: { id: documentId },
        data: {
          entities: {
            set: []
          }
        }
      });

      // Then connect new entities
      const result = await client.document.update({
        where: { id: documentId },
        data: {
          entities: {
            connect: entityIds.map(id => ({ id }))
          }
        },
        include: {
          entities: true
        }
      });

      logger.debug(`Updated entities for document: ${documentId}`);
      return result as DatabaseDocument;
    } catch (error) {
      logger.error(`Failed to update entities for document ${documentId}:`, error);
      throw new AppError('Failed to update document entities');
    }
  }

  /**
   * Get documents count by type
   */
  async countByType(tx?: PrismaClient): Promise<Array<{ documentType: DocumentType; count: number }>> {
    try {
      const client = tx || prisma;
      const result = await client.document.groupBy({
        by: ['documentType'],
        _count: {
          documentType: true
        }
      });

      return result.map(r => ({
        documentType: r.documentType,
        count: r._count.documentType
      }));
    } catch (error) {
      logger.error('Failed to count documents by type:', error);
      throw new AppError('Failed to get document type statistics');
    }
  }

  /**
   * Find recent documents
   */
  async findRecent(limit = 10, tx?: PrismaClient): Promise<DatabaseDocument[]> {
    try {
      const client = tx || prisma;
      const result = await client.document.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          entities: true
        }
      });

      return result as DatabaseDocument[];
    } catch (error) {
      logger.error('Failed to find recent documents:', error);
      throw new AppError('Failed to find recent documents');
    }
  }

  /**
   * Find documents by date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    pagination?: PaginationParams,
    tx?: PrismaClient
  ): Promise<PaginatedResult<DatabaseDocument>> {
    try {
      const client = tx || prisma;
      const where = {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };

      const queryOptions: any = {
        where,
        include: { entities: true },
        orderBy: { createdAt: 'desc' }
      };

      if (pagination) {
        queryOptions.skip = pagination.skip;
        queryOptions.take = pagination.limit;
      }

      const [documents, total] = await Promise.all([
        client.document.findMany(queryOptions),
        client.document.count({ where })
      ]);

      return {
        data: documents as DatabaseDocument[],
        total
      };
    } catch (error) {
      logger.error('Failed to find documents by date range:', error);
      throw new AppError('Failed to find documents');
    }
  }

  /**
   * Get documents with most entities
   */
  async findWithMostEntities(limit = 10, tx?: PrismaClient): Promise<DatabaseDocument[]> {
    try {
      const client = tx || prisma;
      const result = await client.document.findMany({
        take: limit,
        include: {
          entities: true,
          _count: {
            select: { entities: true }
          }
        },
        orderBy: {
          entities: {
            _count: 'desc'
          }
        }
      });

      return result as DatabaseDocument[];
    } catch (error) {
      logger.error('Failed to find documents with most entities:', error);
      throw new AppError('Failed to find documents');
    }
  }

  /**
   * Build WHERE clause for document queries
   */
  private buildWhereClause(queryParams: DocumentsQueryParams): any {
    const where: any = {};

    if (queryParams.id) {
      where.id = queryParams.id;
    }

    if (queryParams.documentType) {
      where.documentType = queryParams.documentType;
    }

    if (queryParams.keyword) {
      where.OR = [
        { title: { contains: queryParams.keyword, mode: 'insensitive' } },
        { content: { contains: queryParams.keyword, mode: 'insensitive' } }
      ];
    }

    if (queryParams.entity) {
      where.entities = {
        some: {
          OR: [
            { id: queryParams.entity },
            { name: { contains: queryParams.entity, mode: 'insensitive' } }
          ]
        }
      };
    }

    return where;
  }
}