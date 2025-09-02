/**
 * Mock Supabase Service for Local Development and Testing
 * This service provides mock implementations when real Supabase is not available
 */

class MockSupabaseService {
  constructor() {
    this.isMock = true
    console.log('🔧 Using Mock Supabase Service for local development')
  }

  // Mock table operations
  from(tableName) {
    return new MockTableQuery(tableName)
  }

  // Mock auth operations
  auth = {
    getUser: async () => ({ data: { user: { id: 'mock-user-id' } }, error: null }),
    signUp: async () => ({ data: { user: { id: 'mock-user-id' } }, error: null }),
    signIn: async () => ({ data: { user: { id: 'mock-user-id' } }, error: null }),
    signOut: async () => ({ error: null })
  }

  // Mock storage operations
  storage = {
    from: (bucket) => ({
      upload: async () => ({ data: { path: 'mock-file-path' }, error: null }),
      download: async () => ({ data: new Blob(), error: null }),
      remove: async () => ({ error: null })
    })
  }
}

class MockTableQuery {
  constructor(tableName) {
    this.tableName = tableName
    this.filters = []
    this.orderBy = null
    this.range = null
    this.select = null
  }

  select(columns = '*', options = {}) {
    this.select = { columns, options }
    return this
  }

  eq(column, value) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  ilike(column, value) {
    this.filters.push({ type: 'ilike', column, value })
    return this
  }

  order(column, options = {}) {
    this.orderBy = { column, options }
    return this
  }

  range(start, end) {
    this.range = { start, end }
    return this
  }

  insert(data) {
    return new MockInsertResult(data)
  }

  async single() {
    return this.execute()
  }

  async execute() {
    // Return mock data based on table name
    const mockData = this.getMockData()
    
    if (this.range) {
      const start = this.range.start
      const end = this.range.end
      const sliced = mockData.slice(start, end + 1)
      return { data: sliced, error: null, count: mockData.length }
    }
    
    return { data: mockData, error: null, count: mockData.length }
  }

  getMockData() {
    switch (this.tableName) {
      case 'tasks':
        return [
          {
            id: 'mock-task-1',
            user_id: 'mock-user-id',
            status: 'PENDING',
            vendor_url: 'https://example.com',
            ticket_details: 'Mock task details',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      case 'task_steps':
        return [
          {
            id: 'mock-step-1',
            task_id: 'mock-task-1',
            step_number: 1,
            action: 'navigate',
            status: 'COMPLETED',
            created_at: new Date().toISOString()
          }
        ]
      default:
        return []
    }
  }
}

class MockInsertResult {
  constructor(data) {
    this.data = data
  }

  select() {
    return this
  }

  single() {
    return Promise.resolve({ 
      data: { ...this.data, id: 'mock-generated-id' }, 
      error: null 
    })
  }
}

// Create mock client function
export function createMockClient() {
  return new MockSupabaseService()
}

// Export the mock service
export default MockSupabaseService
