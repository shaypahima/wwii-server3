import { EntityType, PrismaClient } from '@prisma/client';
import { BaseRepository, PaginatedResult } from './BaseRepository';
import { prisma } from '../config/database';
import { DatabaseEntity, Entity } from '../types/database';
import { EntitiesQueryParams, PaginationParams } from '../types/api';
import { logger } from '../utils/logger';
import { AppError } from '../types/common';

export class EntityRepository extends BaseRepository<DatabaseEntity> {
  constructor() {
    super(prisma.entity, 'entity');
  }

  /**
   * Find entity by name and type
   */
  async findByNameAndType(name: string, type: EntityType, tx?: PrismaClient): Promise<DatabaseEntity | null> {
    try {
      const client = tx || prisma;
      const result = await client.entity.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          type
        }
      });

      return result as DatabaseEntity;
    } catch (error) {
      logger.error(`Failed to find entity by name and type:`, error);
      throw new AppError('Failed to find entity');
    }
  }

  /**
   * Find entity by ID with documents
   */
  async findByIdWithDocuments(id: string, tx?: PrismaClient): Promise<DatabaseEntity | null> {
    try {
      const client = tx || prisma;
      const result = await client.entity.findUnique({
        where: { id },
        include: {
          documents: {
            orderBy: { createdAt: 'desc' },
            take: 10 // Limit to recent 10 documents
          },
          _count: {
            select: { documents: true }
          }
        }
      });

      return result as DatabaseEntity;
    } catch (error) {
      logger.error(`Failed to find entity with documents by ID ${id}:`, error);
      throw new AppError('Failed to find entity');
    }
  }

  /**
   * Find entities with pagination and filtering
   */
  async findManyWithPagination(
    queryParams: EntitiesQueryParams,
    pagination: PaginationParams,
    tx?: PrismaClient
  ): Promise<PaginatedResult<DatabaseEntity>> {
    try {
      const client = tx || prisma;
      const where = this.buildWhereClause(queryParams);

      const [entities, total] = await Promise.all([
        client.entity.findMany({
          where,
          skip: pagination.skip,
          take: pagination.limit,
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { documents: true }
            }
          }
        }),
        client.entity.count({ where })
      ]);

      return {
        data: entities as DatabaseEntity[],
        total
      };
    } catch (error) {
      logger.error('Failed to find entities with pagination:', error);
      throw new AppError('Failed to find entities');
    }
  }

  /**
   * Search entities by name
   */
  async search(
    searchTerm: string,
    pagination: PaginationParams,
    tx?: PrismaClient
  ): Promise<PaginatedResult<DatabaseEntity>> {
    try {
      const client = tx || prisma;
      const where = {
        name: { contains: searchTerm, mode: 'insensitive' }
      };

      const [entities, total] = await Promise.all([
        client.entity.findMany({
          where,
          skip: pagination.skip,
          take: pagination.limit,
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { documents: true }
            }
          }
        }),
        client.entity.count({ where })
      ]);

      return {
        data: entities as DatabaseEntity[],
        total
      };
    } catch (error) {
      logger.error('Failed to search entities:', error);
      throw new AppError('Failed to search entities');
    }
  }

  /**
   * Find entities by type
   */
  async findByType(type: EntityType, pagination?: PaginationParams, tx?: PrismaClient): Promise<PaginatedResult<DatabaseEntity>> {
    try {
      const client = tx || prisma;
      const where = { type };

      const queryOptions: any = {
        where,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { documents: true }
          }
        }
      };

      if (pagination) {
        queryOptions.skip = pagination.skip;
        queryOptions.take = pagination.limit;
      }

      const [entities, total] = await Promise.all([
        client.entity.findMany(queryOptions),
        client.entity.count({ where })
      ]);

      return {
        data: entities as DatabaseEntity[],
        total
      };
    } catch (error) {
      logger.error(`Failed to find entities by type ${type}:`, error);
      throw new AppError('Failed to find entities');
    }
  }

  /**
   * Create entity from Entity interface
   */
  async createFromEntity(entityData: Entity, tx?: PrismaClient): Promise<DatabaseEntity> {
    try {
      const client = tx || prisma;
      
      const data: any = {
        name: entityData.name,
        type: entityData.type
      };

      // Handle date entities
      if (entityData.type === EntityType.date && entityData.name) {
        try {
          const date = new Date(entityData.name);
          if (!isNaN(date.getTime())) {
            data.date = date.toISOString();
          }
        } catch (error) {
          logger.warn(`Invalid date format for entity: ${entityData.name}`);
        }
      }

      const result = await client.entity.create({
        data
      });

      logger.debug(`Created entity: ${result.id} (${result.name})`);
      return result as DatabaseEntity;
    } catch (error) {
      logger.error('Failed to create entity:', error);
      throw new AppError('Failed to create entity');
    }
  }

  /**
   * Find or create entity
   */
  async findOrCreate(entityData: Entity, tx?: PrismaClient): Promise<DatabaseEntity> {
    try {
      const client = tx || prisma;
      
      // First try to find existing entity
      const existing = await this.findByNameAndType(entityData.name, entityData.type, client);
      
      if (existing) {
        return existing;
      }

      // Create new entity if not found
      return await this.createFromEntity(entityData, client);
    } catch (error) {
      logger.error('Failed to find or create entity:', error);
      throw new AppError('Failed to find or create entity');
    }
  }

  /**
   * Get entities count by type
   */
  async countByType(tx?: PrismaClient): Promise<Array<{ type: EntityType; count: number }>> {
    try {
      const client = tx || prisma;
      const result = await client.entity.groupBy({
        by: ['type'],
        _count: {
          type: true
        }
      });

      return result.map(r => ({
        type: r.type,
        count: r._count.type
      }));
    } catch (error) {
      logger.error('Failed to count entities by type:', error);
      throw new AppError('Failed to get entity type statistics');
    }
  }

  /**
   * Find entities with most documents
   */
  async findWithMostDocuments(limit = 10, tx?: PrismaClient): Promise<DatabaseEntity[]> {
    try {
      const client = tx || prisma;
      const result = await client.entity.findMany({
        take: limit,
        include: {
          _count: {
            select: { documents: true }
          }
        },
        orderBy: {
          documents: {
            _count: 'desc'
          }
        }
      });

      return result as DatabaseEntity[];
    } catch (error) {
      logger.error('Failed to find entities with most documents:', error);
      throw new AppError('Failed to find entities');
    }
  }

  /**
   * Find date entities in range
   */
  async findDateEntitiesInRange(
    startDate: Date,
    endDate: Date,
    pagination?: PaginationParams,
    tx?: PrismaClient
  ): Promise<PaginatedResult<DatabaseEntity>> {
    try {
      const client = tx || prisma;
      const where = {
        type: EntityType.date,
        date: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString()
        }
      };

      const queryOptions: any = {
        where,
        orderBy: { date: 'asc' },
        include: {
          _count: {
            select: { documents: true }
          }
        }
      };

      if (pagination) {
        queryOptions.skip = pagination.skip;
        queryOptions.take = pagination.limit;
      }

      const [entities, total] = await Promise.all([
        client.entity.findMany(queryOptions),
        client.entity.count({ where })
      ]);

      return {
        data: entities as DatabaseEntity[],
        total
      };
    } catch (error) {
      logger.error('Failed to find date entities in range:', error);
      throw new AppError('Failed to find date entities');
    }
  }

  /**
   * Find orphaned entities (entities with no documents)
   */
  async findOrphaned(pagination: PaginationParams, tx?: PrismaClient): Promise<PaginatedResult<DatabaseEntity>> {
    try {
      const client = tx || prisma;
      const where = {
        documents: {
          none: {}
        }
      };

      const [entities, total] = await Promise.all([
        client.entity.findMany({
          where,
          skip: pagination.skip,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' }
        }),
        client.entity.count({ where })
      ]);

      return {
        data: entities as DatabaseEntity[],
        total
      };
    } catch (error) {
      logger.error('Failed to find orphaned entities:', error);
      throw new AppError('Failed to find orphaned entities');
    }
  }

  /**
   * Delete orphaned entities
   */
  async deleteOrphaned(tx?: PrismaClient): Promise<number> {
    try {
      const client = tx || prisma;
      const result = await client.entity.deleteMany({
        where: {
          documents: {
            none: {}
          }
        }
      });

      logger.info(`Deleted ${result.count} orphaned entities`);
      return result.count;
    } catch (error) {
      logger.error('Failed to delete orphaned entities:', error);
      throw new AppError('Failed to delete orphaned entities');
    }
  }

  /**
   * Get entity statistics by type
   */
  async getStatsByType(tx?: PrismaClient): Promise<Array<{
    type: EntityType;
    count: number;
    documentsCount: number;
    averageDocumentsPerEntity: number;
  }>> {
    try {
      const client = tx || prisma;
      
      const stats = await client.entity.groupBy({
        by: ['type'],
        _count: {
          id: true
        },
        _sum: {
          documents: {
            _count: true
          }
        }
      });

      // Get document counts for each type (this is a complex query, so we'll do it separately)
      const results = await Promise.all(
        stats.map(async (stat) => {
          const documentsCount = await client.entity.aggregate({
            where: { type: stat.type },
            _sum: {
              documents: {
                _count: true
              }
            }
          });

          return {
            type: stat.type,
            count: stat._count.id,
            documentsCount: documentsCount._sum.documents?._count || 0,
            averageDocumentsPerEntity: stat._count.id > 0 
              ? (documentsCount._sum.documents?._count || 0) / stat._count.id 
              : 0
          };
        })
      );

      return results;
    } catch (error) {
      logger.error('Failed to get entity statistics by type:', error);
      throw new AppError('Failed to get entity statistics');
    }
  }

  /**
   * Build WHERE clause for entity queries
   */
  private buildWhereClause(queryParams: EntitiesQueryParams): any {
    const where: any = {};

    if (queryParams.id) {
      where.id = queryParams.id;
    }

    if (queryParams.type) {
      where.type = queryParams.type;
    }

    if (queryParams.keyword) {
      where.name = { contains: queryParams.keyword, mode: 'insensitive' };
    }

    if (queryParams.date) {
      where.date = { equals: queryParams.date };
    }

    return where;
  }
}