import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';
import { DocumentProcessingService } from '../services/DocumentProcessingService';
import { StorageService } from '../services/StorageService';
import { ValidationService } from '../services/ValidationService';
import { CacheService } from '../services/CacheService';
import { AIService } from '../services/AIService';
import { DocumentRepository } from '../repositories/DocumentRepository';
import { EntityRepository } from '../repositories/EntityRepository';
import {
  validateFileId,
  validateDocumentBody,
  validatePagination,
  validateSearchQuery
} from '../middleware/validation';
import {
  authenticateToken,
  optionalAuth,
  analysisRateLimit,
  uploadRateLimit,
  strictRateLimit
} from '../middleware/auth';
import { errorHandler, asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Initialize services and repositories
const cacheService = new CacheService();
const documentRepository = new DocumentRepository();
const entityRepository = new EntityRepository();
const storageService = new StorageService(cacheService);
const validationService = new ValidationService(documentRepository);
const aiService = new AIService();
const documentProcessingService = new DocumentProcessingService(
  documentRepository,
  entityRepository,
  aiService,
  storageService,
  validationService,
  cacheService
);

// Initialize controller
const documentController = new DocumentController(
  documentProcessingService,
  storageService,
  validationService
);

// Apply authentication to all routes (can be overridden per route)
router.use(authenticateToken);

/**
 * @route GET /api/google-drive/documents
 * @desc Get directory content from Google Drive
 * @access Private
 * @query {string} [folderId] - Specific folder ID to browse
 */
router.get(
  '/',
  strictRateLimit,
  validatePagination,
  asyncHandler(documentController.getDirectoryContent)
);

/**
 * @route GET /api/google-drive/documents/metadata/:fileId
 * @desc Get file metadata from Google Drive
 * @access Private
 */
router.get(
  '/metadata/:fileId',
  validateFileId,
  asyncHandler(documentController.getDocumentMetadata)
);

/**
 * @route POST /api/google-drive/documents/analyze/:fileId
 * @desc Analyze document content using AI
 * @access Private
 * @query {boolean} [forceRefresh] - Force refresh cached analysis
 * @query {boolean} [includeImage] - Include converted image in response
 */
router.post(
  '/analyze/:fileId',
  analysisRateLimit,
  validateFileId,
  asyncHandler(documentController.analyzeDocument)
);

/**
 * @route POST /api/google-drive/documents/process/:fileId
 * @desc Process document (analyze and optionally save)
 * @access Private
 * @query {boolean} [autoSave] - Automatically save analysis to database
 * @query {boolean} [async] - Process asynchronously
 */
router.post(
  '/process/:fileId',
  analysisRateLimit,
  validateFileId,
  asyncHandler(documentController.processDocument)
);

/**
 * @route POST /api/google-drive/documents/save
 * @desc Save analyzed document to database
 * @access Private
 * @body {CreateDocumentRequest} Document data to save
 */
router.post(
  '/save',
  validateDocumentBody,
  asyncHandler(documentController.saveAnalyzedDocument)
);

/**
 * @route GET /api/google-drive/documents/status/:jobId
 * @desc Get processing status for async jobs
 * @access Private
 */
router.get(
  '/status/:jobId',
  asyncHandler(documentController.getProcessingStatus)
);

/**
 * @route DELETE /api/google-drive/documents/cancel/:jobId
 * @desc Cancel processing job
 * @access Private
 */
router.delete(
  '/cancel/:jobId',
  asyncHandler(documentController.cancelProcessing)
);

/**
 * @route GET /api/google-drive/documents/search
 * @desc Search files in Google Drive
 * @access Private
 * @query {string} q - Search query (required)
 * @query {string} [folderId] - Limit search to specific folder
 */
router.get(
  '/search',
  strictRateLimit,
  validateSearchQuery,
  asyncHandler(async (req, res, next) => {
    try {
      const { q: query, folderId } = req.query;
      
      const files = await storageService.searchFiles(
        query as string,
        folderId as string | undefined
      );

      res.json({
        success: true,
        message: 'Search completed successfully',
        data: files,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  })
);

/**
 * @route GET /api/google-drive/documents/health
 * @desc Check Google Drive service health
 * @access Private
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    try {
      const isHealthy = await storageService.testConnection();
      const storageInfo = await storageService.getStorageInfo();

      res.json({
        success: true,
        message: 'Google Drive service is healthy',
        data: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          storage: storageInfo,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Google Drive service health check failed',
        timestamp: new Date().toISOString()
      });
    }
  })
);

export default router;