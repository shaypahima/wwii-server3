import { Request, Response } from 'express';
import { AppError } from '../types/common';
import { logger } from '../utils/logger';
import { ApiResponse, PaginationParams, PaginatedResponse } from '../types/api';

export abstract class BaseController {
  protected handleSuccess<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      message: message || 'Operation completed successfully',
      data,
      timestamp: new Date().toISOString()
    };

    res.status(statusCode).json(response);
  }

  protected handlePaginatedSuccess<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    message?: string
  ): void {
    const response: PaginatedResponse<T> = {
      success: true,
      message: message || 'Data retrieved successfully',
      data,
      pagination,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  }

  protected handleError(res: Response, error: unknown, req?: Request): void {
    logger.error('Controller error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: req?.url,
      method: req?.method,
      params: req?.params,
      query: req?.query,
      timestamp: new Date().toISOString()
    });

    if (error instanceof AppError) {
      const response: ApiResponse<null> = {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString()
      };
      
      return res.status(error.statusCode).json(response);
    }

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      if (prismaError.code === 'P2002') {
        const response: ApiResponse<null> = {
          success: false,
          error: 'A record with this data already exists',
          statusCode: 409,
          timestamp: new Date().toISOString()
        };
        return res.status(409).json(response);
      }
    }

    // Default error response
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      statusCode: 500,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }

  protected extractPaginationParams(req: Request): PaginationParams {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  protected validateRequiredFields(data: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      !data[field] || (typeof data[field] === 'string' && !data[field].trim())
    );

    if (missingFields.length > 0) {
      throw new AppError(
        `Missing required fields: ${missingFields.join(', ')}`,
        400
      );
    }
  }

  protected sanitizeOutput<T extends Record<string, any>>(
    data: T,
    fieldsToExclude: string[] = []
  ): Partial<T> {
    const sanitized = { ...data };
    fieldsToExclude.forEach(field => delete sanitized[field]);
    return sanitized;
  }
}