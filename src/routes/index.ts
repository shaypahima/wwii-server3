import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types/api';
import { logger } from '../utils/logger';
import config from '../config/environment';
import { DatabaseClient } from '../config/database';
import { strictRateLimit } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

// Import route modules
import googleDriveRoutes from './googleDriveRoutes';
import databaseRoutes from './database';

const router = Router();

// ============================================================================
// MAIN API ROUTES
// ============================================================================

// Google Drive document routes
router.use('/google-drive/documents', googleDriveRoutes);

// Database routes
router.use('/database', databaseRoutes);

// ============================================================================
// ROOT API ROUTE
// ============================================================================

/**
 * @route GET /api
 * @desc API root endpoint with basic information
 * @access Public
 */
router.get('/', (req: Request, res: Response) => {
  const response: ApiResponse<{
    name: string;
    version: string;
    environment: string;
    status: string;
    endpoints: string[];
  }> = {
    success: true,
    message: 'WW2 Scanner API is running',
    data: {
      name: 'WW2 Scanner API',
      version: '1.0.0',
      environment: config.NODE_ENV,
      status: 'operational',
      endpoints: [
        '/api/google-drive/documents',
        '/api/database',
        '/api/health',
        '/api/status'
      ]
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
});

// ============================================================================
// HEALTH CHECK ROUTES
// ============================================================================

/**
 * @route GET /api/health
 * @desc Comprehensive health check
 * @access Public
 */
router.get('/health', strictRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Check all services
  const healthChecks = await Promise.allSettled([
    checkDatabaseHealth(),
    checkMemoryUsage(),
    checkDiskSpace()
  ]);

  const [dbHealth, memoryHealth, diskHealth] = healthChecks.map(result => 
    result.status === 'fulfilled' ? result.value : { status: 'unhealthy', error: 'unknown' }
  );

  const overall = dbHealth.status === 'healthy' && 
                 memoryHealth.status === 'healthy' && 
                 diskHealth.status === 'healthy' ? 'healthy' : 'unhealthy';

  const responseTime = Date.now() - startTime;

  const response: ApiResponse<{
    status: string;
    uptime: number;
    responseTime: number;
    timestamp: string;
    services: {
      database: any;
      memory: any;
      disk: any;
    };
    system: {
      nodeVersion: string;
      platform: string;
      arch: string;
    };
  }> = {
    success: overall === 'healthy',
    message: `System is ${overall}`,
    data: {
      status: overall,
      uptime: process.uptime(),
      responseTime,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        memory: memoryHealth,
        disk: diskHealth
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    },
    timestamp: new Date().toISOString()
  };

  const statusCode = overall === 'healthy' ? 200 : 503;
  res.status(statusCode).json(response);
}));

/**
 * @route GET /api/status
 * @desc Quick status check
 * @access Public
 */
router.get('/status', (req: Request, res: Response) => {
  const response: ApiResponse<{
    status: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    timestamp: string;
  }> = {
    success: true,
    message: 'Server is running',
    data: {
      status: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
});

// ============================================================================
// UTILITY ROUTES
// ============================================================================

/**
 * @route GET /api/config
 * @desc Get public configuration information
 * @access Public
 */
router.get('/config', (req: Request, res: Response) => {
  const response: ApiResponse<{
    environment: string;
    features: {
      fileUpload: boolean;
      aiAnalysis: boolean;
      caching: boolean;
    };
    limits: {
      maxFileSize: string;
      maxEntitiesPerDocument: number;
      supportedFileTypes: string[];
    };
  }> = {
    success: true,
    message: 'Configuration retrieved successfully',
    data: {
      environment: config.NODE_ENV,
      features: {
        fileUpload: true,
        aiAnalysis: true,
        caching: true
      },
      limits: {
        maxFileSize: config.MAX_FILE_SIZE,
        maxEntitiesPerDocument: 50,
        supportedFileTypes: config.ALLOWED_FILE_TYPES
      }
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
});

// ============================================================================
// ERROR HANDLING FOR UNDEFINED ROUTES
// ============================================================================

/**
 * Handle undefined API routes
 */
router.use('*', (req: Request, res: Response) => {
  const response: ApiResponse<null> = {
    success: false,
    error: `API route ${req.method} ${req.originalUrl} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString()
  };

  res.status(404).json(response);
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function checkDatabaseHealth(): Promise<{ status: string; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const isHealthy = await DatabaseClient.healthCheck();
    const responseTime = Date.now() - startTime;
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Database health check failed:', error);
    
    return {
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function checkMemoryUsage(): Promise<{ status: string; usage: NodeJS.MemoryUsage; percentage: number }> {
  return new Promise((resolve) => {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const percentage = Math.round((usedMem / totalMem) * 100);
    
    const status = percentage > 90 ? 'unhealthy' : percentage > 80 ? 'degraded' : 'healthy';
    
    resolve({
      status,
      usage: memUsage,
      percentage
    });
  });
}

function checkDiskSpace(): Promise<{ status: string; message: string }> {
  return new Promise((resolve) => {
    // Simplified disk check - in production, you'd want to check actual disk usage
    try {
      const stats = require('fs').statSync('.');
      resolve({
        status: 'healthy',
        message: 'Disk space available'
      });
    } catch (error) {
      resolve({
        status: 'unhealthy',
        message: 'Cannot access disk'
      });
    }
  });
}

export default router;