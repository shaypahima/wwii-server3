import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { DocumentProcessingService } from '../services/DocumentProcessingService';
import { StorageService } from '../services/StorageService';
import { ValidationService } from '../services/ValidationService';
import { AppError } from '../types/common';
import { CreateDocumentRequest, AnalyzeDocumentRequest } from '../types/api';
import { FileListItem } from '../types/database';

export class DocumentController extends BaseController {
  constructor(
    private documentService: DocumentProcessingService,
    private storageService: StorageService,
    private validationService: ValidationService
  ) {
    super();
  }

  /**
   * Get directory content from Google Drive
   */
  getDirectoryContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { folderId } = req.query;
      
      const files: FileListItem[] = await this.storageService.getDirectoryContent(
        folderId as string
      );

      this.handleSuccess(res, files, 'Directory content retrieved successfully');
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Get file metadata from Google Drive
   */
  getDocumentMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        throw new AppError('File ID is required', 400);
      }

      const metadata = await this.storageService.getFileMetadata(fileId);
      
      this.handleSuccess(res, metadata, 'File metadata retrieved successfully');
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Analyze document content using AI
   */
  analyzeDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileId } = req.params;
      const options = req.query as AnalyzeDocumentRequest;

      if (!fileId) {
        throw new AppError('File ID is required', 400);
      }

      const result = await this.documentService.analyzeDocument(fileId, options);
      
      this.handleSuccess(
        res, 
        result, 
        'Document analyzed successfully', 
        200
      );
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Save analyzed document to database
   */
  saveAnalyzedDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const documentData = req.body as CreateDocumentRequest;

      // Validate document data
      const validation = this.validationService.validateDocumentForSave(documentData);
      if (!validation.isValid) {
        throw new AppError(
          `Validation failed: ${validation.errors.join(', ')}`,
          400
        );
      }

      const savedDocument = await this.documentService.saveDocument(documentData);
      
      this.handleSuccess(
        res, 
        savedDocument, 
        'Document saved successfully', 
        201
      );
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Process document (analyze and save in one step)
   */
  processDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileId } = req.params;
      const { autoSave = false } = req.query;

      if (!fileId) {
        throw new AppError('File ID is required', 400);
      }

      const result = await this.documentService.processDocument(
        fileId,
        { autoSave: autoSave === 'true' }
      );
      
      this.handleSuccess(
        res, 
        result, 
        'Document processed successfully', 
        200
      );
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Get processing status
   */
  getProcessingStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        throw new AppError('Job ID is required', 400);
      }

      const status = await this.documentService.getProcessingStatus(jobId);
      
      this.handleSuccess(res, status, 'Processing status retrieved successfully');
    } catch (error) {
      this.handleError(res, error, req);
    }
  };

  /**
   * Cancel processing job
   */
  cancelProcessing = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        throw new AppError('Job ID is required', 400);
      }

      await this.documentService.cancelProcessing(jobId);
      
      this.handleSuccess(res, null, 'Processing cancelled successfully');
    } catch (error) {
      this.handleError(res, error, req);
    }
  };
}