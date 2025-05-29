import { PrismaClient } from "@prisma/client";

class DatabaseClient {
  private static instance: PrismaClient;
  
  public static getInstance(): PrismaClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
        errorFormat: 'pretty',
      });
    }
    return DatabaseClient.instance;
  }
  
  public static async disconnect(): Promise<void> {
    if (DatabaseClient.instance) {
      await DatabaseClient.instance.$disconnect();
    }
  }
}

export const prisma = DatabaseClient.getInstance();