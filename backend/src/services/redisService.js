import Redis from 'redis'
import config from '../config/index.js'

/**
 * Redis Service for BullMQ Queue Management
 * Handles Redis connection, health checks, and queue configuration
 */
class RedisService {
  constructor() {
    this.client = null
    this.isConnected = false
    this.connectionOptions = {
      url: config.redis.url,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4, // Use IPv4
    }
  }

  /**
   * Initialize Redis connection
   * @returns {Promise<boolean>}
   */
  async connect() {
    try {
      if (this.isConnected && this.client) {
        console.log('✅ Redis already connected')
        return true
      }

      console.log('🔌 Connecting to Redis...')
      
      this.client = Redis.createClient(this.connectionOptions)

      // Error handling
      this.client.on('error', (error) => {
        console.error('❌ Redis connection error:', error)
        this.isConnected = false
      })

      this.client.on('connect', () => {
        console.log('✅ Redis client connected')
      })

      this.client.on('ready', () => {
        console.log('✅ Redis client ready')
        this.isConnected = true
      })

      this.client.on('end', () => {
        console.log('🔌 Redis connection ended')
        this.isConnected = false
      })

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...')
      })

      // Connect to Redis
      await this.client.connect()
      
      console.log('✅ Redis service initialized successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error)
      this.isConnected = false
      return false
    }
  }

  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit()
        this.client = null
        this.isConnected = false
        console.log('✅ Redis disconnected successfully')
      }
    } catch (error) {
      console.error('❌ Error disconnecting from Redis:', error)
    }
  }

  /**
   * Get Redis client instance
   * @returns {Object} Redis client
   */
  getClient() {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected. Call connect() first.')
    }
    return this.client
  }

  /**
   * Health check for Redis connection
   * @returns {Promise<{status: string, latency: number, error: string}>}
   */
  async healthCheck() {
    try {
      if (!this.client || !this.isConnected) {
        return {
          status: 'disconnected',
          latency: null,
          error: 'Redis client not connected'
        }
      }

      const startTime = Date.now()
      await this.client.ping()
      const latency = Date.now() - startTime

      return {
        status: 'healthy',
        latency: latency,
        error: null
      }
    } catch (error) {
      console.error('❌ Redis health check failed:', error)
      return {
        status: 'unhealthy',
        latency: null,
        error: error.message
      }
    }
  }

  /**
   * Test Redis operations
   * @returns {Promise<boolean>}
   */
  async testOperations() {
    try {
      const client = this.getClient()
      
      // Test basic operations
      const testKey = 'test:connection'
      const testValue = 'redis-working'
      
      await client.set(testKey, testValue, { EX: 10 }) // Expire in 10 seconds
      const retrievedValue = await client.get(testKey)
      await client.del(testKey)

      if (retrievedValue === testValue) {
        console.log('✅ Redis operations test passed')
        return true
      } else {
        console.error('❌ Redis operations test failed - value mismatch')
        return false
      }
    } catch (error) {
      console.error('❌ Redis operations test failed:', error)
      return false
    }
  }

  /**
   * Get Redis connection info
   * @returns {Object}
   */
  getConnectionInfo() {
    return {
      url: config.redis.url,
      isConnected: this.isConnected,
      client: this.client ? 'initialized' : 'not initialized'
    }
  }

  /**
   * Get Redis memory usage statistics
   * @returns {Promise<Object>}
   */
  async getMemoryStats() {
    try {
      const client = this.getClient()
      const info = await client.info('memory')
      
      // Parse memory info
      const lines = info.split('\r\n')
      const memoryStats = {}
      
      lines.forEach(line => {
        if (line.includes(':') && !line.startsWith('#')) {
          const [key, value] = line.split(':')
          memoryStats[key] = value
        }
      })

      return {
        success: true,
        stats: memoryStats,
        error: null
      }
    } catch (error) {
      console.error('❌ Failed to get Redis memory stats:', error)
      return {
        success: false,
        stats: null,
        error: error.message
      }
    }
  }

  /**
   * Clear Redis cache (use with caution)
   * @param {string} pattern - Key pattern to delete (optional)
   * @returns {Promise<{deleted: number, error: string}>}
   */
  async clearCache(pattern = null) {
    try {
      const client = this.getClient()
      let deletedCount = 0

      if (pattern) {
        const keys = await client.keys(pattern)
        if (keys.length > 0) {
          deletedCount = await client.del(keys)
        }
      } else {
        // Clear all keys (use very carefully)
        await client.flushDb()
        deletedCount = -1 // Indicates full flush
      }

      console.log(`✅ Redis cache cleared. Deleted: ${deletedCount} keys`)
      return { deleted: deletedCount, error: null }
    } catch (error) {
      console.error('❌ Failed to clear Redis cache:', error)
      return { deleted: 0, error: error.message }
    }
  }
}

// Export singleton instance
export default new RedisService() 