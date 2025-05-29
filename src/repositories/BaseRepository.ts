import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../types/common';
import { PaginationParams } from '../types/api';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export abstract class BaseRepository<T> {
  protected model: any;
  protected modelName: string;

  constructor(model: any, modelName: string) {
    this.model = model;
    this.modelName = modelName;
  }

  /**
   * Find record by ID
   */
  async findById(id: string, tx?: PrismaClient): Promise<T | null> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].findUnique({
        where: { id }
      });
      
      return result as T;
    } catch (error) {
      logger.error(`Failed to find ${this.modelName} by ID ${id}:`, error);
      throw new AppError(`Failed to find ${this.modelName}`);
    }
  }

  /**
   * Find multiple records by IDs
   */
  async findByIds(ids: string[], tx?: PrismaClient): Promise<T[]> {
    try {
      const client = tx || prisma;
      const results = await client[this.modelName].findMany({
        where: {
          id: { in: ids }
        }
      });
      
      return results as T[];
    } catch (error) {
      logger.error(`Failed to find ${this.modelName}s by IDs:`, error);
      throw new AppError(`Failed to find ${this.modelName}s`);
    }
  }

  /**
   * Create new record
   */
  async create(data: Partial<T>, tx?: PrismaClient): Promise<T> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].create({
        data
      });
      
      logger.debug(`Created ${this.modelName} with ID: ${result.id}`);
      return result as T;
    } catch (error) {
      logger.error(`Failed to create ${this.modelName}:`, error);
      throw new AppError(`Failed to create ${this.modelName}`);
    }
  }

  /**
   * Update record by ID
   */
  async update(id: string, data: Partial<T>, tx?: PrismaClient): Promise<T> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].update({
        where: { id },
        data
      });
      
      logger.debug(`Updated ${this.modelName} with ID: ${id}`);
      return result as T;
    } catch (error) {
      logger.error(`Failed to update ${this.modelName} ${id}:`, error);
      throw new AppError(`Failed to update ${this.modelName}`);
    }
  }

  /**
   * Delete record by ID
   */
  async delete(id: string, tx?: PrismaClient): Promise<void> {
    try {
      const client = tx || prisma;
      await client[this.modelName].delete({
        where: { id }
      });
      
      logger.debug(`Deleted ${this.modelName} with ID: ${id}`);
    } catch (error) {
      logger.error(`Failed to delete ${this.modelName} ${id}:`, error);
      throw new AppError(`Failed to delete ${this.modelName}`);
    }
  }

  /**
   * Delete multiple records by IDs
   */
  async deleteMany(ids: string[], tx?: PrismaClient): Promise<number> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].deleteMany({
        where: {
          id: { in: ids }
        }
      });
      
      logger.debug(`Deleted ${result.count} ${this.modelName}s`);
      return result.count;
    } catch (error) {
      logger.error(`Failed to delete multiple ${this.modelName}s:`, error);
      throw new AppError(`Failed to delete ${this.modelName}s`);
    }
  }

  /**
   * Count total records
   */
  async count(where?: any, tx?: PrismaClient): Promise<number> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].count({
        where
      });
      
      return result;
    } catch (error) {
      logger.error(`Failed to count ${this.modelName}s:`, error);
      throw new AppError(`Failed to count ${this.modelName}s`);
    }
  }

  /**
   * Find all records
   */
  async findAll(tx?: PrismaClient): Promise<T[]> {
    try {
      const client = tx || prisma;
      const results = await client[this.modelName].findMany();
      
      return results as T[];
    } catch (error) {
      logger.error(`Failed to find all ${this.modelName}s:`, error);
      throw new AppError(`Failed to find ${this.modelName}s`);
    }
  }

  /**
   * Find with pagination
   */
  async findWithPagination(
    where: any,
    pagination: PaginationParams,
    orderBy?: any,
    include?: any,
    tx?: PrismaClient
  ): Promise<PaginatedResult<T>> {
    try {
      const client = tx || prisma;
      
      const [data, total] = await Promise.all([
        client[this.modelName].findMany({
          where,
          skip: pagination.skip,
          take: pagination.limit,
          orderBy: orderBy || { createdAt: 'desc' },
          include
        }),
        client[this.modelName].count({ where })
      ]);

      return {
        data: data as T[],
        total
      };
    } catch (error) {
      logger.error(`Failed to find ${this.modelName}s with pagination:`, error);
      throw new AppError(`Failed to find ${this.modelName}s`);
    }
  }

  /**
   * Find first record matching criteria
   */
  async findFirst(where: any, include?: any, tx?: PrismaClient): Promise<T | null> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].findFirst({
        where,
        include
      });
      
      return result as T;
    } catch (error) {
      logger.error(`Failed to find first ${this.modelName}:`, error);
      throw new AppError(`Failed to find ${this.modelName}`);
    }
  }

  /**
   * Find many records matching criteria
   */
  async findMany(
    where?: any,
    include?: any,
    orderBy?: any,
    take?: number,
    skip?: number,
    tx?: PrismaClient
  ): Promise<T[]> {
    try {
      const client = tx || prisma;
      const results = await client[this.modelName].findMany({
        where,
        include,
        orderBy,
        take,
        skip
      });
      
      return results as T[];
    } catch (error) {
      logger.error(`Failed to find ${this.modelName}s:`, error);
      throw new AppError(`Failed to find ${this.modelName}s`);
    }
  }

  /**
   * Upsert record (create or update)
   */
  async upsert(
    where: any,
    create: any,
    update: any,
    tx?: PrismaClient
  ): Promise<T> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].upsert({
        where,
        create,
        update
      });
      
      logger.debug(`Upserted ${this.modelName} with ID: ${result.id}`);
      return result as T;
    } catch (error) {
      logger.error(`Failed to upsert ${this.modelName}:`, error);
      throw new AppError(`Failed to upsert ${this.modelName}`);
    }
  }

  /**
   * Check if record exists
   */
  async exists(where: any, tx?: PrismaClient): Promise<boolean> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].findFirst({
        where,
        select: { id: true }
      });
      
      return result !== null;
    } catch (error) {
      logger.error(`Failed to check if ${this.modelName} exists:`, error);
      throw new AppError(`Failed to check ${this.modelName} existence`);
    }
  }

  /**
   * Get aggregate data
   */
  async aggregate(aggregation: any, tx?: PrismaClient): Promise<any> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].aggregate(aggregation);
      
      return result;
    } catch (error) {
      logger.error(`Failed to aggregate ${this.modelName} data:`, error);
      throw new AppError(`Failed to aggregate ${this.modelName} data`);
    }
  }

  /**
   * Get grouped data
   */
  async groupBy(groupBy: any, tx?: PrismaClient): Promise<any[]> {
    try {
      const client = tx || prisma;
      const results = await client[this.modelName].groupBy(groupBy);
      
      return results;
    } catch (error) {
      logger.error(`Failed to group ${this.modelName} data:`, error);
      throw new AppError(`Failed to group ${this.modelName} data`);
    }
  }

  /**
   * Batch operations
   */
  async createMany(data: Partial<T>[], tx?: PrismaClient): Promise<number> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].createMany({
        data,
        skipDuplicates: true
      });
      
      logger.debug(`Created ${result.count} ${this.modelName}s`);
      return result.count;
    } catch (error) {
      logger.error(`Failed to create many ${this.modelName}s:`, error);
      throw new AppError(`Failed to create ${this.modelName}s`);
    }
  }

  /**
   * Update many records
   */
  async updateMany(where: any, data: Partial<T>, tx?: PrismaClient): Promise<number> {
    try {
      const client = tx || prisma;
      const result = await client[this.modelName].updateMany({
        where,
        data
      });
      
      logger.debug(`Updated ${result.count} ${this.modelName}s`);
      return result.count;
    } catch (error) {
      logger.error(`Failed to update many ${this.modelName}s:`, error);
      throw new AppError(`Failed to update ${this.modelName}s`);
    }
  }

  /**
   * Execute raw query
   */
  async executeRaw(query: string, params?: any[], tx?: PrismaClient): Promise<any> {
    try {
      const client = tx || prisma;
      const result = await client.$queryRawUnsafe(query, ...params || []);
      
      return result;
    } catch (error) {
      logger.error(`Failed to execute raw query:`, error);
      throw new AppError('Failed to execute database query');
    }
  }

  /**
   * Get table statistics
   */
  async getStats(tx?: PrismaClient): Promise<{
    totalRecords: number;
    createdToday: number;
    createdThisWeek: number;
    createdThisMonth: number;
  }> {
    try {
      const client = tx || prisma;
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay.getTime() - (startOfDay.getDay() * 24 * 60 * 60 * 1000));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalRecords, createdToday, createdThisWeek, createdThisMonth] = await Promise.all([
        client[this.modelName].count(),
        client[this.modelName].count({
          where: { createdAt: { gte: startOfDay } }
        }),
        client[this.modelName].count({
          where: { createdAt: { gte: startOfWeek } }
        }),
        client[this.modelName].count({
          where: { createdAt: { gte: startOfMonth } }
        })
      ]);

      return {
        totalRecords,
        createdToday,
        createdThisWeek,
        createdThisMonth
      };
    } catch (error) {
      logger.error(`Failed to get ${this.modelName} stats:`, error);
      throw new AppError(`Failed to get ${this.modelName} statistics`);
    }
  }
}