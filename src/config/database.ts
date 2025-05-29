import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

class DatabaseClient {
  private static instance: PrismaClient;
  private static isConnected = false;

  public static getInstance(): PrismaClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new PrismaClient({
        log: [
          { level: "error", emit: "event" } as const,
          ...(process.env.NODE_ENV === "development" 
            ? [
                { level: "warn", emit: "event" } as const,
                { level: "info", emit: "event" } as const,
              ]
            : [])
        ],
        errorFormat: "pretty",
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });


      process.on("beforeExit", async () => {
        logger.info("Database connection closing...");
        DatabaseClient.isConnected = false;
      });

      (DatabaseClient.instance as any).$on("error", (error : Error) => {
        logger.error("Database error:", error);
      });
    }

    return DatabaseClient.instance;
  }

  public static async connect(): Promise<void> {
    if (!DatabaseClient.isConnected) {
      try {
        const client = DatabaseClient.getInstance();
        await client.$connect();
        DatabaseClient.isConnected = true;
        logger.info("Database connected successfully");
      } catch (error) {
        logger.error("Failed to connect to database:", error);
        throw error;
      }
    }
  }

  public static async disconnect(): Promise<void> {
    if (DatabaseClient.instance && DatabaseClient.isConnected) {
      try {
        await DatabaseClient.instance.$disconnect();
        DatabaseClient.isConnected = false;
        logger.info("Database disconnected successfully");
      } catch (error) {
        logger.error("Error disconnecting from database:", error);
        throw error;
      }
    }
  }

  public static async healthCheck(): Promise<boolean> {
    try {
      const client = DatabaseClient.getInstance();
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error("Database health check failed:", error);
      return false;
    }
  }

  public static isReady(): boolean {
    return DatabaseClient.isConnected;
  }
}

export const prisma = DatabaseClient.getInstance();
export { DatabaseClient };
