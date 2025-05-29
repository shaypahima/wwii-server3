import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../types/common';
import { ApiResponse } from '../types/api';
import { logger } from '../utils/logger';
import config from '../config/environment';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * JWT Authentication middleware
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Access token is required',
      statusCode: 401,
      timestamp: new Date().toISOString()
    };
    return res.status(401).json(response);
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user'
    };
    
    next();
  } catch (error) {
    logger.warn('JWT verification failed:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid or expired token',
      statusCode: 401,
      timestamp: new Date().toISOString()
    };
    return res.status(401).json(response);
  }
};

/**
 * Optional authentication middleware
 * Sets user if token is valid, but doesn't require it
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user'
    };
  } catch (error) {
    logger.debug('Optional auth failed:', error);
    // Continue without user for optional auth
  }
  
  next();
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Authentication required',
        statusCode: 401,
        timestamp: new Date().toISOString()
      };
      return res.status(401).json(response);
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Insufficient permissions',
        statusCode: 403,
        timestamp: new Date().toISOString()
      };
      return res.status(403).json(response);
    }

    next();
  };
};

/**
 * Admin role requirement
 */
export const requireAdmin = requireRole('admin');

/**
 * API Key authentication middleware
 */
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'API key is required',
      statusCode: 401,
      timestamp: new Date().toISOString()
    };
    return res.status(401).json(response);
  }

  // In a real application, you would validate the API key against a database
  const validApiKeys = process.env.API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid API key',
      statusCode: 401,
      timestamp: new Date().toISOString()
    };
    return res.status(401).json(response);
  }

  next();
};

/**
 * Rate limiting middleware
 */
interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (options: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
    
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      // First request or window expired
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return next();
    }
    
    if (record.count >= options.max) {
      const response: ApiResponse<null> = {
        success: false,
        error: options.message || 'Too many requests, please try again later',
        statusCode: 429,
        timestamp: new Date().toISOString()
      };
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': options.max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
      });
      
      return res.status(429).json(response);
    }
    
    // Increment counter
    record.count++;
    rateLimitStore.set(key, record);
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': options.max.toString(),
      'X-RateLimit-Remaining': (options.max - record.count).toString(),
      'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
    });
    
    next();
  };
};

/**
 * Common rate limits
 */
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 uploads per minute
  message: 'Too many upload requests, please try again later.'
});

export const analysisRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 analysis requests per minute
  message: 'Too many analysis requests, please try again later.'
});

/**
 * CORS configuration middleware
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://your-frontend-domain.com'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key'
  ]
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (config.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data: any) {
    const duration = Date.now() - start;
    
    logger.info('Outgoing response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Health check bypass (skip auth for health checks)
 */
export const healthCheckBypass = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }
  
  // Apply authentication for all other routes
  return authenticateToken(req, res, next);
};

/**
 * Generate JWT token
 */
export const generateToken = (payload: { id: string; email: string; role?: string }) => {
  const jwtSecret: jwt.Secret = process.env.JWT_SECRET || 'your-secret-key';
  const expiresIn: any = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(payload, jwtSecret, { expiresIn });
};

/**
 * Refresh token middleware
 */
export const refreshToken = (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Refresh token is required',
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(response);
  }
  
  try {
    const jwtSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
    const decoded = jwt.verify(refreshToken, jwtSecret) as any;
    
    // Generate new access token
    const newToken = generateToken({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    });
    
    const response: ApiResponse<{ token: string }> = {
      success: true,
      message: 'Token refreshed successfully',
      data: { token: newToken },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    logger.warn('Refresh token verification failed:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid refresh token',
      statusCode: 401,
      timestamp: new Date().toISOString()
    };
    return res.status(401).json(response);
  }
};