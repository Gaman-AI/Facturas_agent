import { createClient } from '@supabase/supabase-js'
import config from '../config/index.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * TaskService - Database operations for automation tasks and task steps
 * Handles CRUD operations, status updates, and task step logging
 */
class TaskService {
  constructor() {
    // Create admin client with service key for server-side operations
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
  }

  /**
   * Create a new automation task
   * @param {string} userId - User ID from Supabase Auth
   * @param {Object} taskData - Task creation data
   * @returns {Promise<{task: Object, error: string}>}
   */
  async createTask(userId, taskData) {
    try {
      const taskId = uuidv4()
      const now = new Date().toISOString()

      // Only use columns that exist in the actual schema
      const taskRecord = {
        id: taskId,
        user_id: userId,
        status: 'PENDING',
        vendor_url: taskData.vendor_url,
        ticket_details: taskData.ticket_details,
        created_at: now,
        updated_at: now
      }

      const { data, error } = await this.supabase
        .from('tasks')
        .insert(taskRecord)
        .select()
        .single()

      if (error) {
        console.error('❌ Task creation failed:', error)
        return { task: null, error: error.message }
      }

      console.log('✅ Task created successfully:', taskId)
      return { task: data, error: null }
    } catch (error) {
      console.error('❌ Unexpected error in createTask:', error)
      return { task: null, error: error.message }
    }
  }

  /**
   * Get tasks for a specific user with pagination and filtering
   * @param {string} userId - User ID
   * @param {number} offset - Pagination offset
   * @param {number} limit - Page size
   * @param {Object} filters - Filtering options
   * @returns {Promise<{tasks: Array, total: number, error: string}>}
   */
  async getUserTasks(userId, offset = 0, limit = 20, filters = {}) {
    try {
      let query = this.supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Apply filters if provided
      if (filters.status) {
        query = query.eq('status', filters.status.toUpperCase())
      }

      if (filters.vendor_url) {
        query = query.ilike('vendor_url', `%${filters.vendor_url}%`)
      }

      const { data, error, count } = await query
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('❌ Failed to fetch user tasks:', error)
        return { tasks: [], total: 0, error: error.message }
      }

      return { tasks: data || [], total: count || 0, error: null }
    } catch (error) {
      console.error('❌ Unexpected error in getUserTasks:', error)
      return { tasks: [], total: 0, error: error.message }
    }
  }

  /**
   * Get a specific task by ID (with user ownership verification)
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<{task: Object, error: string}>}
   */
  async getTask(taskId, userId = null) {
    try {
      let query = this.supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)

      // Add user filter if provided (for authorization)
      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') {
          return { task: null, error: 'Task not found or access denied' }
        }
        console.error('❌ Failed to fetch task:', error)
        return { task: null, error: error.message }
      }

      return { task: data, error: null }
    } catch (error) {
      console.error('❌ Unexpected error in getTask:', error)
      return { task: null, error: error.message }
    }
  }

  /**
   * Get a task with its steps
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<{task: Object, error: string}>}
   */
  async getTaskWithSteps(taskId, userId = null) {
    try {
      // First get the task
      const taskResult = await this.getTask(taskId, userId)
      
      if (taskResult.error || !taskResult.task) {
        return taskResult
      }

      // Then get the steps
      const { data: steps, error: stepsError } = await this.supabase
        .from('task_steps')
        .select('*')
        .eq('task_id', taskId)
        .order('timestamp', { ascending: true })

      if (stepsError) {
        console.error('❌ Failed to fetch task steps:', stepsError)
        return { task: taskResult.task, error: null } // Return task without steps
      }

      return { 
        task: {
          ...taskResult.task,
          steps: steps || []
        }, 
        error: null 
      }
    } catch (error) {
      console.error('❌ Unexpected error in getTaskWithSteps:', error)
      return { task: null, error: error.message }
    }
  }

  /**
   * Update task status and related information
   * @param {string} taskId - Task ID
   * @param {string} status - New status
   * @param {string} errorMessage - Error message if status is FAILED
   * @param {Object} result - Result data for completed tasks
   * @returns {Promise<{task: Object, error: string}>}
   */
  async updateTaskStatus(taskId, status, errorMessage = null, result = null) {
    try {
      const now = new Date().toISOString()
      
      const updateData = {
        status: status.toUpperCase(),
        updated_at: now
      }

      // Add completion timestamp for terminal states
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status.toUpperCase())) {
        updateData.completed_at = now
      }

      // Add error message for failed tasks
      if (status.toUpperCase() === 'FAILED' && errorMessage) {
        updateData.failure_reason = errorMessage
      }

      // Add result data if provided
      if (result) {
        updateData.result = result
      }

      const { data, error } = await this.supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to update task status:', error)
        return { task: null, error: error.message }
      }

      return { task: data, error: null }
    } catch (error) {
      console.error('❌ Unexpected error in updateTaskStatus:', error)
      return { task: null, error: error.message }
    }
  }

  /**
   * Add a step to a task
   * @param {string} taskId - Task ID
   * @param {string} stepType - Type of step
   * @param {string} content - Step content
   * @param {Object} options - Additional options
   * @returns {Promise<{step: Object, error: string}>}
   */
  async addTaskStep(taskId, stepType, content, options = {}) {
    try {
      // Only use columns that exist in the actual schema
      const stepRecord = {
        id: uuidv4(),
        task_id: taskId,
        step_type: stepType,
        content: content,
        screenshot_url: options.screenshot_url || null,
        timestamp: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('task_steps')
        .insert(stepRecord)
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to add task step:', error)
        return { step: null, error: error.message }
      }

      return { step: data, error: null }
    } catch (error) {
      console.error('❌ Unexpected error in addTaskStep:', error)
      return { step: null, error: error.message }
    }
  }

  /**
   * Delete a task and its associated steps
   * @param {string} taskId - Task ID
   * @returns {Promise<{success: boolean, error: string}>}
   */
  async deleteTask(taskId) {
    try {
      // First delete task steps
      const { error: stepsError } = await this.supabase
        .from('task_steps')
        .delete()
        .eq('task_id', taskId)

      if (stepsError) {
        console.error('❌ Failed to delete task steps:', stepsError)
        return { success: false, error: stepsError.message }
      }

      // Then delete the task
      const { error: taskError } = await this.supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (taskError) {
        console.error('❌ Failed to delete task:', taskError)
        return { success: false, error: taskError.message }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('❌ Unexpected error in deleteTask:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get task statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<{stats: Object, error: string}>}
   */
  async getUserTaskStats(userId) {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('status')
        .eq('user_id', userId)

      if (error) {
        console.error('❌ Failed to fetch task stats:', error)
        return { stats: null, error: error.message }
      }

      const stats = {
        total: data.length,
        pending: data.filter(t => t.status === 'PENDING').length,
        running: data.filter(t => t.status === 'RUNNING').length,
        completed: data.filter(t => t.status === 'COMPLETED').length,
        failed: data.filter(t => t.status === 'FAILED').length,
        paused: data.filter(t => t.status === 'PAUSED').length,
        cancelled: data.filter(t => t.status === 'CANCELLED').length
      }

      return { stats, error: null }
    } catch (error) {
      console.error('❌ Unexpected error in getUserTaskStats:', error)
      return { stats: null, error: error.message }
    }
  }

  /**
   * Health check for TaskService
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    try {
      // Test database connectivity
      const { data, error } = await this.supabase
        .from('tasks')
        .select('count', { count: 'exact', head: true })
        .limit(0)

      if (error) {
        return {
          database: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }

      // Test task_steps table
      const { error: stepsError } = await this.supabase
        .from('task_steps')
        .select('count', { count: 'exact', head: true })
        .limit(0)

      return {
        database: 'healthy',
        tables: {
          tasks: !error,
          task_steps: !stepsError
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        database: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Increment retry count for a task
   * @param {string} taskId - Task ID
   * @returns {Promise<{success: boolean, error: string}>}
   */
  async incrementTaskRetryCount(taskId) {
    try {
      // Get current task
      const { data: currentTask, error: getError } = await this.supabase
        .from('tasks')
        .select('retry_count')
        .eq('id', taskId)
        .single()

      if (getError) {
        return { success: false, error: getError.message }
      }

      // Increment retry count
      const newRetryCount = (currentTask.retry_count || 0) + 1
      
      const { error: updateError } = await this.supabase
        .from('tasks')
        .update({ 
          retry_count: newRetryCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('❌ Unexpected error in incrementRetryCount:', error)
      return { success: false, error: error.message }
    }
  }
}

// Export singleton instance
export default new TaskService() 