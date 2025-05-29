import { createCanvas, loadImage } from 'canvas';
import mammoth from 'mammoth';
import pdf2pic from 'pdf2pic';
import { AppError } from '../types/common';
import { File } from "../types/database";
import logger from "./logger";

/**
 * Convert document to image format
 */
export async function documentToImage(file: File): Promise<string> {
  try {
    if (!file.data) {
      throw new AppError('File data is required for conversion');
    }

    logger.info(`Converting ${file.mimeType} file to image: ${file.name}`);

    switch (file.mimeType) {
      case 'application/pdf':
        return await convertPdfToImage(file);
      
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await convertDocToImage(file);
      
      case 'image/jpeg':
      case 'image/jpg':
      case 'image/png':
      case 'image/gif':
      case 'image/bmp':
        return await convertImageToDataUrl(file);
      
      default:
        throw new AppError(`Unsupported file type: ${file.mimeType}`);
    }
  } catch (error) {
    logger.error(`Failed to convert document to image:`, error);
    throw new AppError(`Document conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert PDF to image
 */
async function convertPdfToImage(file: File): Promise<string> {
  try {
    const convert = pdf2pic.fromBuffer(file.data!, {
      density: 300,           // Output resolution
      saveFilename: "page",
      savePath: "/tmp",
      format: "png",
      width: 2480,           
      height: 3508          
    });

    const result = await convert(1, { responseType: "buffer" });
    
    if (!result.buffer) {
      throw new Error('Failed to convert PDF page to buffer');
    }

    // Convert buffer to data URL
    const base64 = result.buffer.toString('base64');
    return `data:image/png;base64,${base64}`;

  } catch (error) {
    logger.error('PDF conversion failed:', error);
    throw new AppError('Failed to convert PDF to image');
  }
}

/**
 * Convert Word document to image
 */
async function convertDocToImage(file: File): Promise<string> {
  try {
    // First extract text from document
    const result = await mammoth.extractRawText({ buffer: file.data! });
    const text = result.value;

    if (!text.trim()) {
      throw new Error('No text content found in document');
    }

    // Create a canvas with the text content
    const canvas = createCanvas(800, 1000);
    const ctx = canvas.getContext('2d');

    // Set background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set text style
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';

    // Word wrap and draw text
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    const maxWidth = canvas.width - 40; // 20px margin on each side

    for (const word of words) {
      const testLine = currentLine + word + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    // Draw lines
    const lineHeight = 20;
    lines.forEach((line, index) => {
      ctx.fillText(line, 20, 30 + (index * lineHeight));
    });

    // Convert canvas to data URL
    return canvas.toDataURL('image/png');

  } catch (error) {
    logger.error('Document conversion failed:', error);
    throw new AppError('Failed to convert document to image');
  }
}

/**
 * Convert image file to data URL
 */
async function convertImageToDataUrl(file: File): Promise<string> {
  try {
    const base64 = file.data!.toString('base64');
    return `data:${file.mimeType};base64,${base64}`;
  } catch (error) {
    logger.error('Image conversion failed:', error);
    throw new AppError('Failed to convert image file');
  }
}


/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  const nameWithoutExtension = originalName.substring(0, originalName.lastIndexOf('.'));
  
  return `${nameWithoutExtension}_${timestamp}_${random}.${extension}`;
}

/**
 * Validate file type
 */
export function isValidFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Parse file size string to bytes
 */
export function parseFileSize(sizeStr: string): number {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmgt]?b)$/);
  
  if (!match) return 0;
  
  const [, size, unit] = match;
  return Math.floor(parseFloat(size) * (units[unit as keyof typeof units] || 1));
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w\s.-]/g, '') // Remove special characters except dots, hyphens, and spaces
    .replace(/\s+/g, '_')      // Replace spaces with underscores
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .replace(/_+/g, '_')       // Replace multiple underscores with single underscore
    .toLowerCase();
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
      await sleep(delay);
    }
  }

  throw lastError!;
}


/**
 * Remove undefined values from object
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * Convert string to title case
 */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Check if string is valid JSON
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Generate hash from string
 */
export function generateHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Convert object to query string
 */
export function objectToQueryString(obj: Record<string, any>): string {
  const params = new URLSearchParams();
  
  for (const key in obj) {
    if (obj[key] !== undefined && obj[key] !== null) {
      params.append(key, String(obj[key]));
    }
  }
  
  return params.toString();
}

/**
 * Parse query string to object
 */
export function queryStringToObject(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  
  return result;
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Clamp number between min and max
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Check if date is valid
 */
export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Format date to ISO string
 */
export function formatDateISO(date: Date): string {
  return date.toISOString();
}

/**
 * Parse date from various formats
 */
export function parseDate(dateStr: string): Date | null {
  const date = new Date(dateStr);
  return isValidDate(date) ? date : null;
}