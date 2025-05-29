import { logger } from '../utils/logger';
import config from '../config/environment';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  hits: number;
  misses: number;
}

export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };
  private readonly maxSize: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    
    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    logger.info(`Cache service initialized with max size: ${maxSize}`);
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, data: T, ttlSeconds = config.CACHE_TTL): void {
    try {
      const now = Date.now();
      const item: CacheItem<T> = {
        data,
        timestamp: now,
        ttl: ttlSeconds * 1000,
        accessCount: 0,
        lastAccessed: now
      };

      // If cache is full, remove least recently used items
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }

      this.cache.set(key, item);
      this.stats.sets++;

      logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      logger.error(`Failed to set cache key ${key}:`, error);
    }
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    try {
      const item = this.cache.get(key);

      if (!item) {
        this.stats.misses++;
        logger.debug(`Cache miss: ${key}`);
        return null;
      }

      const now = Date.now();
      
      // Check if item has expired
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        this.stats.misses++;
        logger.debug(`Cache expired: ${key}`);
        return null;
      }

      // Update access statistics
      item.accessCount++;
      item.lastAccessed = now;
      this.stats.hits++;

      logger.debug(`Cache hit: ${key}`);
      return item.data as T;

    } catch (error) {
      logger.error(`Failed to get cache key ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Check if key exists in cache (without updating access stats)
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) return false;
    
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    logger.info(`Cache cleared: ${size} items removed`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalItems: this.cache.size,
      totalSize: this.calculateTotalSize(),
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      hits: this.stats.hits,
      misses: this.stats.misses
    };
  }

  /**
   * Get cache keys matching pattern
   */
  getKeys(pattern?: string): string[] {
    const keys = Array.from(this.cache.keys());
    
    if (!pattern) return keys;
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  /**
   * Get detailed information about cache items
   */
  getDetailedInfo(): Array<{
    key: string;
    size: number;
    ttl: number;
    age: number;
    accessCount: number;
    lastAccessed: string;
  }> {
    const now = Date.now();
    const items: Array<any> = [];

    for (const [key, item] of this.cache.entries()) {
      items.push({
        key,
        size: this.calculateItemSize(item.data),
        ttl: Math.max(0, Math.round((item.ttl - (now - item.timestamp)) / 1000)),
        age: Math.round((now - item.timestamp) / 1000),
        accessCount: item.accessCount,
        lastAccessed: new Date(item.lastAccessed).toISOString()
      });
    }

    return items.sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Bulk set multiple keys
   */
  setMultiple<T>(items: Array<{ key: string; data: T; ttl?: number }>): void {
    items.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  /**
   * Bulk get multiple keys
   */
  getMultiple<T>(keys: string[]): Map<string, T | null> {
    const results = new Map<string, T | null>();
    
    keys.forEach(key => {
      results.set(key, this.get<T>(key));
    });
    
    return results;
  }

  /**
   * Set with callback for cache miss
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T> | T, 
    ttlSeconds = config.CACHE_TTL
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await factory();
      this.set(key, data, ttlSeconds);
      return data;
    } catch (error) {
      logger.error(`Failed to execute factory function for cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Refresh cache item (reset TTL)
   */
  refresh(key: string, newTtlSeconds?: number): boolean {
    const item = this.cache.get(key);
    
    if (!item) return false;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    item.timestamp = now;
    if (newTtlSeconds !== undefined) {
      item.ttl = newTtlSeconds * 1000;
    }

    return true;
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug(`Cache cleanup: ${expiredCount} expired items removed`);
    }
  }

  /**
   * Evict least recently used items when cache is full
   */
  private evictLRU(): void {
    const items = Array.from(this.cache.entries());
    
    // Sort by last accessed time (oldest first)
    items.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest 10% of items
    const toRemove = Math.max(1, Math.floor(items.length * 0.1));
    
    for (let i = 0; i < toRemove; i++) {
      const [key] = items[i];
      this.cache.delete(key);
    }

    logger.debug(`Cache LRU eviction: ${toRemove} items removed`);
  }

  /**
   * Calculate total cache size in bytes (approximate)
   */
  private calculateTotalSize(): number {
    let totalSize = 0;
    
    for (const [key, item] of this.cache.entries()) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += this.calculateItemSize(item.data);
      totalSize += 64; // Approximate overhead for timestamps, etc.
    }
    
    return totalSize;
  }

  /**
   * Calculate approximate size of cache item
   */
  private calculateItemSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // UTF-16 characters
    } catch {
      return 100; // Fallback estimate
    }
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    logger.info('Cache statistics reset');
  }

  /**
   * Destroy cache service
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.clear();
    logger.info('Cache service destroyed');
  }
}