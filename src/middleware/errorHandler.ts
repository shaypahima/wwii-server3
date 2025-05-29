import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/common';
import { ApiResponse } from '../types/api';
import { logger } from '../utils/logger';
import config from '../config/environment';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error('Global error handler:', {
    error: err.message,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    params: req.params,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Handle AppError (custom application errors)
  if (err instanceof AppError) {
    const response: ApiResponse<null> = {
      success: false,
      error: err.message,
      statusCode: err.statusCode,
      timestamp: new Date().toISOString(),
      ...(config.NODE_ENV === 'development' && { stack: err.stack })
    };
    
    return res.status(err.statusCode).json(response);
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    let message = 'Database operation failed';
    let statusCode = 400;

    switch (prismaError.code) {
      case 'P2002':
        message = 'A record with this data already exists';
        statusCode = 409;
        break;
      case 'P2025':
        message = 'Record not found';
        statusCode = 404;
        break;
      case 'P2003':
        message = 'Foreign key constraint violation';
        statusCode = 400;
        break;
      case 'P2016':
        message = 'Query interpretation error';
        statusCode = 400;
        break;
      default:
        message = 'Database error occurred';
        statusCode = 500;
    }

    const response: ApiResponse<null> = {
      success: false,
      error: message,
      statusCode,
      timestamp: new Date().toISOString(),
      ...(config.NODE_ENV === 'development' && { 
        details: prismaError.message,
        code: prismaError.code 
      })
    };

    return res.status(statusCode).json(response);
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const response: ApiResponse<null> = {
      success: false,
      error: err.message,
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    
    return res.status(400).json(response);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid token',
      statusCode: 401,
      timestamp: new Date().toISOString()
    };
    
    return res.status(401).json(response);
  }

  if (err.name === 'TokenExpiredError') {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Token expired',
      statusCode: 401,
      timestamp: new Date().toISOString()
    };
    
    return res.status(401).json(response);
  }

  // Handle multer errors (file upload)
  if (err.name === 'MulterError') {
    const multerError = err as any;
    let message = 'File upload error';
    
    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = 'File upload failed';
    }

    const response: ApiResponse<null> = {
      success: false,
      error: message,
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    
    return res.status(400).json(response);
  }

  // Handle syntax errors (malformed JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid JSON format',
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    
    return res.status(400).json(response);
  }

  // Handle rate limit errors
  if (err.message && err.message.includes('Too many requests')) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Too many requests, please try again later',
      statusCode: 429,
      timestamp: new Date().toISOString()
    };
    
    return res.status(429).json(response);
  }

  // Default error response
  const response: ApiResponse<null> = {
    success: false,
    error: config.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    statusCode: 500,
    timestamp: new Date().toISOString(),
    ...(config.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(500).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const response: ApiResponse<null> = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString()
  };

  res.status(404).json(response);
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};