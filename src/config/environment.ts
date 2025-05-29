import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  GOOGLE_CREDENTIALS_PATH: string;
  GOOGLE_DRIVE_FOLDER_ID: string;
  GROQ_API_KEY: string;
  LOG_LEVEL: string;
  CACHE_TTL: number;
  MAX_FILE_SIZE: string;
  ALLOWED_FILE_TYPES: string[];
}

const config: EnvironmentConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  GOOGLE_CREDENTIALS_PATH: path.join(__dirname, process.env.GOOGLE_CREDENTIALS_PATH || '../config/credentials/service-account-key.json'),
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '3600', 10),
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '50mb',
  ALLOWED_FILE_TYPES: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,jpeg,png').split(','),
};


// Validate required environment variables



export default config;

