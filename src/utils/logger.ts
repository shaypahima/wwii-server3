import winston from 'winston';
import path from 'path';
import fs from 'fs';
import config from '../config/environment';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += '\n' + JSON.stringify(meta, null, 2);
    }
    return msg;
  })
);

// Create transports
const transports: winston.transport[] = [
  // Error log file
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),

  // Combined log file
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),

  // HTTP access log
  new winston.transports.File({
    filename: path.join(logsDir, 'access.log'),
    level: 'http',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
];

// Add console transport for non-production environments
if (config.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: {
    service: 'ww2-scanner-server',
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  exitOnError: false
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'exceptions.log'),
    format: logFormat
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'rejections.log'),
    format: logFormat
  })
);

// Logger utility functions
export const logUtils = {
  /**
   * Log HTTP request/response
   */
  logHttpRequest: (req: any, res: any, duration: number) => {
    logger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      contentLength: res.get('content-length'),
      userAgent: req.get('user-agent'),
      ip: req.ip,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log database operation
   */
  logDatabaseOperation: (operation: string, table: string, duration: number, rowsAffected?: number) => {
    logger.debug('Database Operation', {
      operation,
      table,
      duration: `${duration}ms`,
      rowsAffected,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log external API call
   */
  logExternalApiCall: (service: string, endpoint: string, method: string, statusCode: number, duration: number) => {
    logger.info('External API Call', {
      service,
      endpoint,
      method,
      statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log business event
   */
  logBusinessEvent: (event: string, details: any) => {
    logger.info('Business Event', {
      event,
      details,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log performance metrics
   */
  logPerformanceMetrics: (metrics: {
    operation: string;
    duration: number;
    memoryUsage?: number;
    cpuUsage?: number;
  }) => {
    logger.debug('Performance Metrics', {
      ...metrics,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log security event
   */
  logSecurityEvent: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any) => {
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    
    logger.log(logLevel, 'Security Event', {
      event,
      severity,
      details,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log cache operation
   */
  logCacheOperation: (operation: 'hit' | 'miss' | 'set' | 'delete', key: string, details?: any) => {
    logger.debug('Cache Operation', {
      operation,
      key,
      details,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log file operation
   */
  logFileOperation: (operation: string, filename: string, size?: number, duration?: number) => {
    logger.debug('File Operation', {
      operation,
      filename,
      size: size ? `${size} bytes` : undefined,
      duration: duration ? `${duration}ms` : undefined,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log validation error
   */
  logValidationError: (field: string, value: any, rule: string, message: string) => {
    logger.warn('Validation Error', {
      field,
      value,
      rule,
      message,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log background job
   */
  logBackgroundJob: (jobId: string, status: string, details?: any) => {
    logger.info('Background Job', {
      jobId,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// Performance monitoring
export const performanceLogger = {
  /**
   * Create a timer for measuring operation duration
   */
  startTimer: (operation: string) => {
    const startTime = process.hrtime();
    const startMemory = process.memoryUsage();

    return {
      end: (details?: any) => {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
        const endMemory = process.memoryUsage();
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

        logUtils.logPerformanceMetrics({
          operation,
          duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
          memoryUsage: memoryDelta,
          ...details
        });

        return duration;
      }
    };
  }
};

// Structured logging helpers
export const structuredLogger = {
  /**
   * Log with correlation ID for request tracing
   */
  withCorrelationId: (correlationId: string) => {
    return {
      info: (message: string, meta?: any) => logger.info(message, { correlationId, ...meta }),
      warn: (message: string, meta?: any) => logger.warn(message, { correlationId, ...meta }),
      error: (message: string, meta?: any) => logger.error(message, { correlationId, ...meta }),
      debug: (message: string, meta?: any) => logger.debug(message, { correlationId, ...meta })
    };
  },

  /**
   * Log with user context
   */
  withUser: (userId: string, userEmail?: string) => {
    return {
      info: (message: string, meta?: any) => logger.info(message, { userId, userEmail, ...meta }),
      warn: (message: string, meta?: any) => logger.warn(message, { userId, userEmail, ...meta }),
      error: (message: string, meta?: any) => logger.error(message, { userId, userEmail, ...meta }),
      debug: (message: string, meta?: any) => logger.debug(message, { userId, userEmail, ...meta })
    };
  }
};

// Export default logger
export default logger;