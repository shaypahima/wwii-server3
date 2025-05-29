import { Groq } from "groq-sdk";
import { DocumentType, EntityType } from "@prisma/client";
import { AppError } from '../types/common';
import { ParsedAnalysis, Entity } from "../types/database";
import logger from "../utils/logger";
import config from "../config/environment";

export class AIService {
  private groq: Groq;
  private readonly systemPrompt: string;

  constructor() {
    this.groq = new Groq({
      apiKey: config.GROQ_API_KEY,
    });

    this.systemPrompt = `You are a document scanner and analyzer specialized in historical documents, particularly from World War II era.

Given a document image, analyze it and provide a JSON response with the following structure:
{
  "title": string, // A descriptive title for the document
  "content": string, // Summary of the document content (2-3 sentences)
  "document_type": "letter"|"report"|"photo"|"newspaper"|"list"|"diary_entry"|"book"|"map"|"biography",
  "entities": [{
    "name": string, // Entity name (e.g., "Winston Churchill", "London", "RAF")
    "type": "person"|"location"|"organization"|"event"|"date"|"unit"
  }]
}

Instructions:
- Provide only the JSON object, no additional text
- Be accurate and specific with entity extraction
- For dates, use format YYYY-MM-DD when possible
- Extract military units, historical figures, places, and events
- Ensure document_type matches one of the specified values exactly
- Keep content summary concise but informative`;
  }

  /**
   * Analyze image using Groq API
   */
  async analyzeImage(imageDataUrl: string, retries = 3): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.info(`Sending request to Groq API (attempt ${attempt}/${retries})`);

        const chatCompletion = await this.groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: this.systemPrompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please analyze this document image and provide the structured JSON response.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageDataUrl,
                  },
                },
              ],
            },
          ],
          model: "meta-llama/llama-4-scout-17b-16e-instruct", // Updated model name
          temperature: 0.3, // Lower temperature for more consistent results
          max_tokens: 1024,
          top_p: 0.9,
        });

        const content = chatCompletion.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error('No content received from Groq API');
        }

        logger.info('Successfully received response from Groq API');
        logger.debug('Groq response:', content);

        return content;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error occurred');
        logger.warn(`Groq API request failed (attempt ${attempt}/${retries}):`, lastError.message);

        if (attempt < retries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('All Groq API attempts failed:', lastError);
    throw new AppError(`Failed to analyze image with AI after ${retries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Parse AI analysis response into structured data
   */
  parseAnalysis(analysisText: string): ParsedAnalysis {
    try {
      logger.info('Parsing AI analysis response');

      // Extract JSON from the response (handle potential markdown formatting)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON object found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      this.validateAnalysisResponse(parsed);

      // Process entities
      const processedEntities: Entity[] = parsed.entities.map((entity: any) => {
        const processedEntity: Entity = {
          name: entity.name.trim(),
          type: entity.type as EntityType,
        };

        // Handle date entities
        if (entity.type === EntityType.date) {
          try {
            const date = new Date(entity.name);
            if (!isNaN(date.getTime())) {
              processedEntity.date = date.toISOString();
            }
          } catch (error) {
            logger.warn(`Invalid date format for entity: ${entity.name}`);
          }
        }

        return processedEntity;
      });

      const result: ParsedAnalysis = {
        documentType: parsed.document_type,
        title: parsed.title.trim(),
        content: parsed.content.trim(),
        entities: processedEntities,
      };
      logger.info('Parsed AI analysis response:', result);
      logger.info('Successfully parsed AI analysis response');
      return result;

    } catch (error) {
      logger.error('Failed to parse AI analysis:', error);
      throw new AppError(`Failed to parse AI analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate AI analysis response structure
   */
  private validateAnalysisResponse(data: any): void {
    const errors: string[] = [];

    // Check required fields
    if (!data.title || typeof data.title !== 'string') {
      errors.push('title must be a non-empty string');
    }

    if (!data.content || typeof data.content !== 'string') {
      errors.push('content must be a non-empty string');
    }

    if (!data.document_type || typeof data.document_type !== 'string') {
      errors.push('document_type must be a non-empty string');
    } else if (!Object.values(DocumentType).includes(data.document_type as DocumentType)) {
      errors.push(`document_type must be one of: ${Object.values(DocumentType).join(', ')}`);
    }

    if (!Array.isArray(data.entities)) {
      errors.push('entities must be an array');
    } else {
      data.entities.forEach((entity: any, index: number) => {
        if (!entity.name || typeof entity.name !== 'string') {
          errors.push(`entities[${index}].name must be a non-empty string`);
        }

        if (!entity.type || typeof entity.type !== 'string') {
          errors.push(`entities[${index}].type must be a non-empty string`);
        } else if (!Object.values(EntityType).includes(entity.type as EntityType)) {
          errors.push(`entities[${index}].type must be one of: ${Object.values(EntityType).join(', ')}`);
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(`Invalid AI response structure: ${errors.join('; ')}`);
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.groq.models.list();
      return models.data.map(model => model.id);
    } catch (error) {
      logger.error('Failed to fetch available models:', error);
      throw new AppError('Failed to fetch available models');
    }
  }

  /**
   * Test AI service connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAvailableModels();
      return true;
    } catch (error) {
      logger.error('AI service connection test failed:', error);
      return false;
    }
  }

  /**
   * Get token usage statistics
   */
  getTokenUsage(): { totalRequests: number; totalTokens: number } {
    // This would need to be implemented with proper tracking
    // For now, return mock data
    return {
      totalRequests: 0,
      totalTokens: 0
    };
  }
}

export default AIService;
