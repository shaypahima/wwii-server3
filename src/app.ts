import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger, securityHeaders, corsConfig } from './middleware/auth';

// Import routes
import apiRoutes from './routes/index';

// Import utilities
import { logger } from './utils/logger';
import config from './config/environment';
import { DatabaseClient } from './config/database';

const app = express();
const PORT = config.PORT;

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors(corsConfig));

// Request logging
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: config.MAX_FILE_SIZE }));
app.use(express.urlencoded({ extended: true, limit: config.MAX_FILE_SIZE }));

// ============================================================================
// ROUTES SETUP
// ============================================================================

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'WW2 Scanner Server is running',
    data: {
      name: 'WW2 Scanner Server',
      version: '1.0.0',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

async function initializeDatabase() {
  try {
    await DatabaseClient.connect();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`Server is listening on port ${PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`API Documentation available at: http://localhost:${PORT}/api`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await DatabaseClient.disconnect();
          logger.info('Database connection closed');
        } catch (error) {
          logger.error('Error closing database connection:', error);
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;