import { createClient } from '@supabase/supabase-js'
import config from '../config/index.js'

/**
 * OCR Performance Service
 * Tracks and analyzes OCR accuracy, processing times, and performance metrics
 */

class OCRPerformanceService {
  constructor() {
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Performance tracking
    this.accuracyThresholds = {
      excellent: 95,
      good: 90,
      warning: 85,
      critical: 80
    }
    
    this.processingTimeThresholds = {
      excellent: 10000, // 10 seconds
      good: 20000,      // 20 seconds
      warning: 30000,   // 30 seconds
      critical: 60000   // 60 seconds
    }
  }

  /**
   * Record OCR processing result
   * @param {Object} ocrResult - OCR processing result
   * @param {string} vendorType - Type of vendor (OXXO, Walmart, etc.)
   * @param {number} processingTime - Processing time in milliseconds
   * @param {Object} extractedData - Extracted data from OCR
   * @param {Object} expectedData - Expected data for accuracy calculation
   * @returns {Promise<Object>}
   */
  async recordOCRResult(ocrResult, vendorType, processingTime, extractedData, expectedData = null) {
    try {
      const accuracy = expectedData ? this.calculateAccuracy(extractedData, expectedData) : null
      
      const performanceRecord = {
        id: this.generateId(),
        vendor_type: vendorType,
        processing_time_ms: processingTime,
        accuracy_percentage: accuracy,
        extracted_data: extractedData,
        expected_data: expectedData,
        ocr_confidence: ocrResult.confidence || null,
        extraction_method: ocrResult.method || 'azure_document_intelligence',
        error_message: ocrResult.error || null,
        created_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('ocr_performance_logs')
        .insert(performanceRecord)
        .select()
        .single()

      if (error) {
        console.error('Failed to record OCR performance:', error)
        return { success: false, error: error.message }
      }

      // Update vendor performance statistics
      await this.updateVendorStats(vendorType, processingTime, accuracy)

      return { success: true, data }
    } catch (error) {
      console.error('Error recording OCR performance:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Calculate accuracy between extracted and expected data
   * @param {Object} extracted - Extracted data
   * @param {Object} expected - Expected data
   * @returns {number} Accuracy percentage
   */
  calculateAccuracy(extracted, expected) {
    const fields = Object.keys(expected)
    let correctFields = 0
    let totalFields = fields.length

    for (const field of fields) {
      const extractedValue = extracted[field]
      const expectedValue = expected[field]

      if (this.compareFieldValues(extractedValue, expectedValue)) {
        correctFields++
      }
    }

    return totalFields > 0 ? (correctFields / totalFields) * 100 : 0
  }

  /**
   * Compare field values for accuracy calculation
   * @param {any} extracted - Extracted value
   * @param {any} expected - Expected value
   * @returns {boolean} Whether values match
   */
  compareFieldValues(extracted, expected) {
    if (extracted === expected) return true
    
    // Handle null/undefined cases
    if (!extracted && !expected) return true
    if (!extracted || !expected) return false
    
    // Normalize strings for comparison
    if (typeof extracted === 'string' && typeof expected === 'string') {
      return extracted.toLowerCase().trim() === expected.toLowerCase().trim()
    }
    
    // Handle numeric values
    if (typeof extracted === 'number' && typeof expected === 'number') {
      return Math.abs(extracted - expected) < 0.01
    }
    
    // Handle dates
    if (extracted instanceof Date && expected instanceof Date) {
      return extracted.getTime() === expected.getTime()
    }
    
    return false
  }

  /**
   * Update vendor performance statistics
   * @param {string} vendorType - Vendor type
   * @param {number} processingTime - Processing time
   * @param {number} accuracy - Accuracy percentage
   */
  async updateVendorStats(vendorType, processingTime, accuracy) {
    try {
      // Get current stats
      const { data: currentStats, error: fetchError } = await this.supabase
        .from('vendor_performance_stats')
        .select('*')
        .eq('vendor_type', vendorType)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Failed to fetch vendor stats:', fetchError)
        return
      }

      const now = new Date().toISOString()
      
      if (currentStats) {
        // Update existing stats
        const newCount = currentStats.total_processing_count + 1
        const newAvgTime = ((currentStats.average_processing_time * currentStats.total_processing_count) + processingTime) / newCount
        const newAvgAccuracy = accuracy ? 
          ((currentStats.average_accuracy * currentStats.total_processing_count) + accuracy) / newCount :
          currentStats.average_accuracy

        const { error: updateError } = await this.supabase
          .from('vendor_performance_stats')
          .update({
            total_processing_count: newCount,
            average_processing_time: newAvgTime,
            average_accuracy: newAvgAccuracy,
            last_processing_time: processingTime,
            last_accuracy: accuracy,
            updated_at: now
          })
          .eq('vendor_type', vendorType)

        if (updateError) {
          console.error('Failed to update vendor stats:', updateError)
        }
      } else {
        // Create new stats record
        const { error: insertError } = await this.supabase
          .from('vendor_performance_stats')
          .insert({
            vendor_type: vendorType,
            total_processing_count: 1,
            average_processing_time: processingTime,
            average_accuracy: accuracy || 0,
            last_processing_time: processingTime,
            last_accuracy: accuracy,
            created_at: now,
            updated_at: now
          })

        if (insertError) {
          console.error('Failed to create vendor stats:', insertError)
        }
      }
    } catch (error) {
      console.error('Error updating vendor stats:', error)
    }
  }

  /**
   * Get OCR performance metrics
   * @param {string} timeRange - Time range for metrics
   * @param {string} vendorType - Optional vendor filter
   * @returns {Promise<Object>}
   */
  async getPerformanceMetrics(timeRange = '24h', vendorType = null) {
    try {
      const now = new Date()
      let startTime
      
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000)
          break
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }

      let query = this.supabase
        .from('ocr_performance_logs')
        .select('*')
        .gte('created_at', startTime.toISOString())

      if (vendorType) {
        query = query.eq('vendor_type', vendorType)
      }

      const { data: logs, error } = await query

      if (error) {
        console.error('Failed to fetch OCR performance logs:', error)
        return { success: false, error: error.message }
      }

      // Calculate metrics
      const validLogs = logs.filter(log => log.accuracy_percentage !== null)
      const totalLogs = logs.length
      const validCount = validLogs.length

      const averageAccuracy = validCount > 0 
        ? validLogs.reduce((sum, log) => sum + log.accuracy_percentage, 0) / validCount 
        : 0

      const averageProcessingTime = totalLogs > 0
        ? logs.reduce((sum, log) => sum + log.processing_time_ms, 0) / totalLogs
        : 0

      const accuracyDistribution = this.calculateAccuracyDistribution(validLogs)
      const processingTimeDistribution = this.calculateProcessingTimeDistribution(logs)
      const vendorBreakdown = this.calculateVendorBreakdown(logs)

      return {
        success: true,
        data: {
          totalProcessingCount: totalLogs,
          validAccuracyCount: validCount,
          averageAccuracy,
          averageProcessingTime,
          accuracyDistribution,
          processingTimeDistribution,
          vendorBreakdown,
          timeRange,
          timestamp: now.toISOString()
        }
      }
    } catch (error) {
      console.error('Error getting OCR performance metrics:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Calculate accuracy distribution
   * @param {Array} logs - OCR performance logs
   * @returns {Object} Accuracy distribution
   */
  calculateAccuracyDistribution(logs) {
    const distribution = {
      excellent: 0, // >= 95%
      good: 0,      // 90-94%
      warning: 0,   // 85-89%
      critical: 0   // < 85%
    }

    logs.forEach(log => {
      const accuracy = log.accuracy_percentage
      if (accuracy >= this.accuracyThresholds.excellent) {
        distribution.excellent++
      } else if (accuracy >= this.accuracyThresholds.good) {
        distribution.good++
      } else if (accuracy >= this.accuracyThresholds.warning) {
        distribution.warning++
      } else {
        distribution.critical++
      }
    })

    return distribution
  }

  /**
   * Calculate processing time distribution
   * @param {Array} logs - OCR performance logs
   * @returns {Object} Processing time distribution
   */
  calculateProcessingTimeDistribution(logs) {
    const distribution = {
      excellent: 0, // < 10s
      good: 0,      // 10-20s
      warning: 0,   // 20-30s
      critical: 0   // > 30s
    }

    logs.forEach(log => {
      const time = log.processing_time_ms
      if (time < this.processingTimeThresholds.excellent) {
        distribution.excellent++
      } else if (time < this.processingTimeThresholds.good) {
        distribution.good++
      } else if (time < this.processingTimeThresholds.warning) {
        distribution.warning++
      } else {
        distribution.critical++
      }
    })

    return distribution
  }

  /**
   * Calculate vendor breakdown
   * @param {Array} logs - OCR performance logs
   * @returns {Object} Vendor breakdown
   */
  calculateVendorBreakdown(logs) {
    const breakdown = {}
    
    logs.forEach(log => {
      const vendor = log.vendor_type
      if (!breakdown[vendor]) {
        breakdown[vendor] = {
          count: 0,
          totalAccuracy: 0,
          totalProcessingTime: 0,
          averageAccuracy: 0,
          averageProcessingTime: 0
        }
      }
      
      breakdown[vendor].count++
      breakdown[vendor].totalProcessingTime += log.processing_time_ms
      
      if (log.accuracy_percentage !== null) {
        breakdown[vendor].totalAccuracy += log.accuracy_percentage
      }
    })

    // Calculate averages
    Object.keys(breakdown).forEach(vendor => {
      const stats = breakdown[vendor]
      stats.averageProcessingTime = stats.totalProcessingTime / stats.count
      
      const validAccuracyCount = logs.filter(log => 
        log.vendor_type === vendor && log.accuracy_percentage !== null
      ).length
      
      stats.averageAccuracy = validAccuracyCount > 0 
        ? stats.totalAccuracy / validAccuracyCount 
        : 0
    })

    return breakdown
  }

  /**
   * Get field-specific accuracy metrics
   * @param {string} timeRange - Time range for metrics
   * @returns {Promise<Object>}
   */
  async getFieldAccuracyMetrics(timeRange = '24h') {
    try {
      const now = new Date()
      let startTime
      
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000)
          break
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }

      const { data: logs, error } = await this.supabase
        .from('ocr_performance_logs')
        .select('extracted_data, expected_data, accuracy_percentage')
        .gte('created_at', startTime.toISOString())
        .not('expected_data', 'is', null)

      if (error) {
        console.error('Failed to fetch field accuracy data:', error)
        return { success: false, error: error.message }
      }

      // Calculate field-specific accuracy
      const fieldAccuracy = {}
      const fieldCounts = {}

      logs.forEach(log => {
        const extracted = log.extracted_data || {}
        const expected = log.expected_data || {}
        
        Object.keys(expected).forEach(field => {
          if (!fieldAccuracy[field]) {
            fieldAccuracy[field] = { correct: 0, total: 0, accuracy: 0 }
            fieldCounts[field] = 0
          }
          
          fieldCounts[field]++
          
          if (this.compareFieldValues(extracted[field], expected[field])) {
            fieldAccuracy[field].correct++
          }
          
          fieldAccuracy[field].total++
        })
      })

      // Calculate accuracy percentages
      Object.keys(fieldAccuracy).forEach(field => {
        const stats = fieldAccuracy[field]
        stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
      })

      return {
        success: true,
        data: {
          fieldAccuracy,
          fieldCounts,
          timeRange,
          timestamp: now.toISOString()
        }
      }
    } catch (error) {
      console.error('Error getting field accuracy metrics:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Health check for OCR performance service
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    try {
      // Test database connectivity
      const { data, error } = await this.supabase
        .from('ocr_performance_logs')
        .select('count', { count: 'exact', head: true })
        .limit(0)

      if (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

// Export singleton instance
export default new OCRPerformanceService()
