import { Router } from 'express';
import { DatabaseController } from '../controllers/DatabaseController';
import { DocumentRepository } from '../repositories/DocumentRepository';
import { EntityRepository } from '../repositories/EntityRepository';
import {
  validateDocumentId,
  validateEntityId,
  validatePagination,
  validateSearchQuery,
  validateDocumentType,
  validateEntityType,
  validateBulkOperation
} from '../middleware/validation';
import {
  authenticateToken,
  optionalAuth,
  strictRateLimit
} from '../middleware/auth';
import { errorHandler, asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Initialize repositories
const documentRepository = new DocumentRepository();
const entityRepository = new EntityRepository();

// Initialize controller
const databaseController = new DatabaseController(
  documentRepository,
  entityRepository
);

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// DOCUMENT ROUTES
// ============================================================================

/**
 * @route GET /api/database/documents
 * @desc Get documents with optional filtering and pagination
 * @access Private
 * @query {string} [keyword] - Search keyword
 * @query {string} [documentType] - Filter by document type
 * @query {string} [entity] - Filter by entity name or ID
 * @query {number} [page=1] - Page number
 * @query {number} [limit=10] - Items per page
 */
router.get(
  '/documents',
  strictRateLimit,
  validatePagination,
  validateDocumentType,
  asyncHandler(databaseController.getDocuments)
);

/**
 * @route GET /api/database/documents/:id
 * @desc Get a single document by ID
 * @access Private
 */
router.get(
  '/documents/:id',
  validateDocumentId,
  asyncHandler(databaseController.getDocumentById)
);

/**
 * @route PUT /api/database/documents/:id
 * @desc Update a document
 * @access Private
 */
router.put(
  '/documents/:id',
  validateDocumentId,
  asyncHandler(databaseController.updateDocument)
);

/**
 * @route DELETE /api/database/documents/:id
 * @desc Delete a document
 * @access Private
 */
router.delete(
  '/documents/:id',
  validateDocumentId,
  asyncHandler(databaseController.deleteDocument)
);

// ============================================================================
// ENTITY ROUTES
// ============================================================================

/**
 * @route GET /api/database/entities
 * @desc Get entities with optional filtering and pagination
 * @access Private
 * @query {string} [keyword] - Search keyword
 * @query {string} [type] - Filter by entity type
 * @query {string} [date] - Filter by date (for date entities)
 * @query {number} [page=1] - Page number
 * @query {number} [limit=10] - Items per page
 */
router.get(
  '/entities',
  strictRateLimit,
  validatePagination,
  validateEntityType,
  asyncHandler(databaseController.getEntities)
);

/**
 * @route GET /api/database/entities/:id
 * @desc Get a single entity by ID
 * @access Private
 */
router.get(
  '/entities/:id',
  validateEntityId,
  asyncHandler(databaseController.getEntityById)
);

// ============================================================================
// STATISTICS AND ANALYTICS ROUTES
// ============================================================================

/**
 * @route GET /api/database/stats
 * @desc Get database statistics
 * @access Private
 */
router.get(
  '/stats',
  strictRateLimit,
  asyncHandler(databaseController.getDatabaseStats)
);

// ============================================================================
// SEARCH ROUTES
// ============================================================================

/**
 * @route GET /api/database/search
 * @desc Global search across documents and entities
 * @access Private
 * @query {string} q - Search query (required)
 * @query {number} [page=1] - Page number
 * @query {number} [limit=10] - Items per page
 */
router.get(
  '/search',
  strictRateLimit,
  validateSearchQuery,
  validatePagination,
  asyncHandler(databaseController.globalSearch)
);

// ============================================================================
// BULK OPERATIONS (Future extension)
// ============================================================================

/**
 * @route POST /api/database/documents/bulk-delete
 * @desc Delete multiple documents
 * @access Private
 */
router.post(
  '/documents/bulk-delete',
  validateBulkOperation(50),
  asyncHandler(async (req, res, next) => {
    // This would be implemented in the DatabaseController
    // For now, return not implemented
    res.status(501).json({
      success: false,
      error: 'Bulk operations not yet implemented',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @route POST /api/database/entities/bulk-delete
 * @desc Delete multiple entities
 * @access Private
 */
router.post(
  '/entities/bulk-delete',
  validateBulkOperation(50),
  asyncHandler(async (req, res, next) => {
    // This would be implemented in the DatabaseController
    // For now, return not implemented
    res.status(501).json({
      success: false,
      error: 'Bulk operations not yet implemented',
      timestamp: new Date().toISOString()
    });
  })
);

// ============================================================================
// HEALTH CHECK ROUTE
// ============================================================================

/**
 * @route GET /api/database/health
 * @desc Check database connection health
 * @access Private
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    try {
      // Check database connectivity
      const documentsCount = await documentRepository.count();
      const entitiesCount = await entityRepository.count();

      res.json({
        success: true,
        message: 'Database is healthy',
        data: {
          status: 'healthy',
          documentsCount,
          entitiesCount,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Database health check failed',
        timestamp: new Date().toISOString()
      });
    }
  })
);

export default router;