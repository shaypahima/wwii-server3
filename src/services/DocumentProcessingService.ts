import { DocumentRepository } from "../repositories/DocumentRepository";
import { EntityRepository } from "../repositories/EntityRepository";
import { AIService } from "./AIService";
import { StorageService } from "./StorageService";
import { ValidationService } from "./ValidationService";
import { CacheService } from "./CacheService";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";
import { AppError } from "../types/common";
import {
  AnalysisResult,
  ProcessingStatus,
  ProcessDocumentOptions,
  CreateDocumentRequest,
} from "../types/api";
import { DatabaseDocument, File } from "../types/database";
import { documentToImage } from "../utils/helpers";

interface ProcessingJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  result?: AnalysisResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
export class DocumentProcessingService {
  private processingJobs: Map<string, ProcessingJob> = new Map();
  constructor(
    private documentRepository: DocumentRepository,
    private entityRepository: EntityRepository,
    private aiService: AIService,
    private storageService: StorageService,
    private validationService: ValidationService,
    private cacheService: CacheService
  ) {}

  /**
   * Analyze a document without saving to database
   */

  async analyzeDocument(
    fileId: string,
    options: any = {}
  ): Promise<AnalysisResult> {
    try {
      // Check cache first
      const cacheKey = `analysis_${fileId}`;
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult && !options.forceRefresh) {
        logger.info(`Returning cached analysis for file ${fileId}`);
        return cachedResult as AnalysisResult;
      }

      logger.info(`Starting document analysis for file ${fileId}`);

      // Get file content and metadata
      const [file, metadata] = await Promise.all([
        this.storageService.getFileContent(fileId),
        this.storageService.getFileMetadata(fileId),
      ]);

      file.name = metadata.name;

      // Convert document to image
      const imageUrl = await this.convertToImage(file);

      // Analyze with AI
      const analysisText = await this.aiService.analyzeImage(imageUrl);
      const parsedAnalysis = this.aiService.parseAnalysis(analysisText);

      const result: AnalysisResult = {
        analysis: parsedAnalysis,
        image: imageUrl,
        fileName: file.name,
        fileId,
        processedAt: new Date().toISOString(),
      };

      // Cache the result
      this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour

      logger.info(`Document analysis completed for file ${fileId}`);
      return result;
    } catch (error) {
      logger.error(`Document analysis failed for file ${fileId}:`, error);
      throw new AppError(
        `Failed to analyze document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
  /**
   * Save analyzed document to database
   */
  async saveDocument(
    documentData: CreateDocumentRequest
  ): Promise<DatabaseDocument> {
    try {
      // Validate document data
      const validation =
        this.validationService.validateDocumentForSave(documentData);
      if (!validation.isValid) {
        throw new AppError(
          `Validation failed: ${validation.errors.join(", ")}`
        );
      }

      // Use transaction for data consistency
      return await prisma.$transaction(async (tx) => {
        // Process entities first
        const processedEntities = await Promise.all(
          documentData.entities.map(async (entityData) => {
            let existingEntity = await this.entityRepository.findByNameAndType(
              entityData.name,
              entityData.type,
              tx
            );

            if (!existingEntity) {
              existingEntity = await this.entityRepository.create(
                entityData,
                tx
              );
            }

            return existingEntity;
          })
        );

        // Create document with entity connections
        const document = await this.documentRepository.createWithEntities(
          {
            title: documentData.title,
            fileName: documentData.fileName,
            content: documentData.content,
            imageUrl: documentData.imageUrl,
            documentType: documentData.documentType,
          },
          processedEntities.map((entity) => entity.id),
          tx
        );

        logger.info(`Document saved successfully: ${document.id}`);
        return document;
      });
    } catch (error) {
      logger.error("Failed to save document:", error);
      throw new AppError(
        `Failed to save document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get processing status for async jobs
   */
  async getProcessingStatus(jobId: string): Promise<ProcessingStatus> {
    const job = this.processingJobs.get(jobId);

    if (!job) {
      throw new AppError("Processing job not found", 404);
    }

    return {
      jobId,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }

  /**
   * Cancel processing job
   */
  async cancelProcessing(jobId: string): Promise<void> {
    const job = this.processingJobs.get(jobId);

    if (!job) {
      throw new AppError("Processing job not found", 404);
    }

    if (job.status === "completed" || job.status === "failed") {
      throw new AppError("Cannot cancel completed or failed job", 400);
    }

    job.status = "cancelled";
    job.updatedAt = new Date();
    this.processingJobs.set(jobId, job);

    logger.info(`Processing job cancelled: ${jobId}`);
  }

  /**
   * Convert document to image
   */
  private async convertToImage(file: File): Promise<string> {
    try {
      const cacheKey = `image_${file.id}_${file.mimeType}`;
      const cachedImage = this.cacheService.get(cacheKey);

      if (typeof cachedImage === "string") {
        logger.info(`Using cached image for file ${file.id}`);
        return cachedImage;
      }

      logger.info(`Converting document to image: ${file.name}`);
      const imageUrl = await documentToImage(file);

      // Cache the converted image
      this.cacheService.set(cacheKey, imageUrl, 7200); // Cache for 2 hours

      return imageUrl;
    } catch (error) {
      logger.error(`Failed to convert document to image:`, error);
      throw new AppError(
        `Failed to convert document to image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Start async processing
   */
  private async startAsyncProcessing(
    jobId: string,
    fileId: string,
    options: ProcessDocumentOptions
  ): Promise<void> {
    const job: ProcessingJob = {
      id: jobId,
      status: "pending",
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.processingJobs.set(jobId, job);

    // Start processing in background
    setImmediate(async () => {
      try {
        job.status = "processing";
        job.progress = 10;
        job.updatedAt = new Date();
        this.processingJobs.set(jobId, job);

        // Analyze document
        job.progress = 50;
        job.updatedAt = new Date();
        this.processingJobs.set(jobId, job);

        const analysisResult = await this.analyzeDocument(fileId, options);

        job.progress = 80;
        job.updatedAt = new Date();
        this.processingJobs.set(jobId, job);

        // Save if requested
        if (options.autoSave && analysisResult.analysis) {
          const documentData: CreateDocumentRequest = {
            title: analysisResult.analysis.title,
            fileName: analysisResult.fileName,
            content: analysisResult.analysis.content,
            imageUrl: analysisResult.image,
            documentType: analysisResult.analysis.documentType,
            entities: analysisResult.analysis.entities,
          };

          const savedDocument = await this.saveDocument(documentData);
          analysisResult.savedDocument = savedDocument;
        }

        job.status = "completed";
        job.progress = 100;
        job.result = analysisResult;
        job.updatedAt = new Date();
        this.processingJobs.set(jobId, job);

        logger.info(`Async processing completed for job ${jobId}`);
      } catch (error) {
        job.status = "failed";
        job.error = error instanceof Error ? error.message : "Unknown error";
        job.updatedAt = new Date();
        this.processingJobs.set(jobId, job);

        logger.error(`Async processing failed for job ${jobId}:`, error);
      }
    });
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old processing jobs
   */
  cleanupOldJobs(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [jobId, job] of this.processingJobs.entries()) {
      if (now.getTime() - job.createdAt.getTime() > maxAge) {
        this.processingJobs.delete(jobId);
        logger.info(`Cleaned up old processing job: ${jobId}`);
      }
    }
  }
}
