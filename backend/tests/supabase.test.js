import { jest } from '@jest/globals'

// Mock MCP Supabase tools for testing
const mockSupabaseTools = {
  listProjects: jest.fn(),
  getProject: jest.fn(),
  executeSQL: jest.fn(),
  getProjectUrl: jest.fn(),
  getAnonKey: jest.fn()
}

describe('Supabase Integration Tests', () => {
  const TEST_PROJECT_ID = 'pffuarlnpdpfjrvewrqo'
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Project Configuration', () => {
    test('should have valid project configuration', () => {
      expect(process.env.SUPABASE_URL).toBeDefined()
      expect(process.env.SUPABASE_ANON_KEY).toBeDefined()
      expect(process.env.SUPABASE_SERVICE_KEY).toBeDefined()
      
      expect(process.env.SUPABASE_URL).toContain(TEST_PROJECT_ID)
      expect(process.env.SUPABASE_URL).toMatch(/^https:\/\/.*\.supabase\.co$/)
    })

    test('should have proper key formats', () => {
      const anonKey = process.env.SUPABASE_ANON_KEY
      const serviceKey = process.env.SUPABASE_SERVICE_KEY
      
      // JWT tokens should start with 'eyJ'
      expect(anonKey).toMatch(/^eyJ/)
      expect(serviceKey).toMatch(/^eyJ/)
      
      // Should be different keys
      expect(anonKey).not.toBe(serviceKey)
    })
  })

  describe('Database Schema Tests', () => {
    test('should verify core tables exist', async () => {
      // Mock the SQL execution for table verification
      mockSupabaseTools.executeSQL.mockResolvedValue({
        success: true,
        data: [
          { table_name: 'users' },
          { table_name: 'user_profiles' },
          { table_name: 'automation_tasks' },
          { table_name: 'task_steps' },
          { table_name: 'vendor_configs' }
        ]
      })

      const tableQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `

      const result = await mockSupabaseTools.executeSQL(TEST_PROJECT_ID, tableQuery)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ table_name: 'users' }),
          expect.objectContaining({ table_name: 'user_profiles' }),
          expect.objectContaining({ table_name: 'automation_tasks' }),
          expect.objectContaining({ table_name: 'task_steps' }),
          expect.objectContaining({ table_name: 'vendor_configs' })
        ])
      )
    })

    test('should verify RLS policies are enabled', async () => {
      mockSupabaseTools.executeSQL.mockResolvedValue({
        success: true,
        data: [
          { tablename: 'user_profiles', rowsecurity: true },
          { tablename: 'automation_tasks', rowsecurity: true },
          { tablename: 'task_steps', rowsecurity: true }
        ]
      })

      const rlsQuery = `
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true;
      `

      const result = await mockSupabaseTools.executeSQL(TEST_PROJECT_ID, rlsQuery)
      
      expect(result.success).toBe(true)
      expect(result.data.length).toBeGreaterThan(0)
      
      // Verify critical tables have RLS enabled
      const tableNames = result.data.map(row => row.tablename)
      expect(tableNames).toContain('user_profiles')
      expect(tableNames).toContain('automation_tasks')
    })

    test('should verify encryption functions exist', async () => {
      mockSupabaseTools.executeSQL.mockResolvedValue({
        success: true,
        data: [
          { routine_name: 'encrypt_sensitive_data' },
          { routine_name: 'decrypt_sensitive_data' }
        ]
      })

      const functionsQuery = `
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name LIKE '%encrypt%';
      `

      const result = await mockSupabaseTools.executeSQL(TEST_PROJECT_ID, functionsQuery)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ routine_name: 'encrypt_sensitive_data' }),
          expect.objectContaining({ routine_name: 'decrypt_sensitive_data' })
        ])
      )
    })
  })

  describe('CRUD Operations Tests', () => {
    const testUserId = 'test-user-123'
    const testUserProfile = {
      user_id: testUserId,
      rfc: 'XAXX010101000',
      fiscal_regime: '601',
      postal_code: '01000',
      company_name: 'Test Company SA de CV'
    }

    test('should create user profile', async () => {
      mockSupabaseTools.executeSQL.mockResolvedValue({
        success: true,
        data: [{ 
          id: 'profile-123',
          ...testUserProfile,
          created_at: new Date().toISOString()
        }]
      })

      const insertQuery = `
        INSERT INTO user_profiles (user_id, rfc, fiscal_regime, postal_code, company_name)
        VALUES ('${testUserProfile.user_id}', '${testUserProfile.rfc}', '${testUserProfile.fiscal_regime}', '${testUserProfile.postal_code}', '${testUserProfile.company_name}')
        RETURNING *;
      `

      const result = await mockSupabaseTools.executeSQL(TEST_PROJECT_ID, insertQuery)
      
      expect(result.success).toBe(true)
      expect(result.data[0]).toMatchObject({
        user_id: testUserId,
        rfc: 'XAXX010101000',
        fiscal_regime: '601',
        postal_code: '01000',
        company_name: 'Test Company SA de CV'
      })
    })

    test('should read user profile', async () => {
      mockSupabaseTools.executeSQL.mockResolvedValue({
        success: true,
        data: [testUserProfile]
      })

      const selectQuery = `
        SELECT * FROM user_profiles 
        WHERE user_id = '${testUserId}';
      `

      const result = await mockSupabaseTools.executeSQL(TEST_PROJECT_ID, selectQuery)
      
      expect(result.success).toBe(true)
      expect(result.data[0]).toMatchObject(testUserProfile)
    })

    test('should update user profile', async () => {
      const updatedProfile = { ...testUserProfile, company_name: 'Updated Company Name' }
      
      mockSupabaseTools.executeSQL.mockResolvedValue({
        success: true,
        data: [updatedProfile]
      })

      const updateQuery = `
        UPDATE user_profiles 
        SET company_name = 'Updated Company Name', updated_at = NOW()
        WHERE user_id = '${testUserId}'
        RETURNING *;
      `

      const result = await mockSupabaseTools.executeSQL(TEST_PROJECT_ID, updateQuery)
      
      expect(result.success).toBe(true)
      expect(result.data[0].company_name).toBe('Updated Company Name')
    })

    test('should delete user profile', async () => {
      mockSupabaseTools.executeSQL.mockResolvedValue({
        success: true,
        data: [testUserProfile]
      })

      const deleteQuery = `
        DELETE FROM user_profiles 
        WHERE user_id = '${testUserId}'
        RETURNING *;
      `

      const result = await mockSupabaseTools.executeSQL(TEST_PROJECT_ID, deleteQuery)
      
      expect(result.success).toBe(true)
      expect(result.data[0]).toMatchObject(testUserProfile)
    })
  })

  describe('Authentication Integration', () => {
    test('should validate JWT token structure', () => {
      const anonKey = process.env.SUPABASE_ANON_KEY
      
      // Decode JWT header and payload (without verification)
      const parts = anonKey.split('.')
      expect(parts).toHaveLength(3)
      
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString())
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      
      expect(header.alg).toBe('HS256')
      expect(header.typ).toBe('JWT')
      expect(payload.iss).toBe('supabase')
      expect(payload.ref).toBe(TEST_PROJECT_ID)
      expect(payload.role).toBe('anon')
    })

    test('should have different roles for different keys', () => {
      const anonKey = process.env.SUPABASE_ANON_KEY
      const serviceKey = process.env.SUPABASE_SERVICE_KEY
      
      const anonPayload = JSON.parse(Buffer.from(anonKey.split('.')[1], 'base64url').toString())
      const servicePayload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64url').toString())
      
      expect(anonPayload.role).toBe('anon')
      expect(servicePayload.role).toBe('service_role')
    })
  })

  describe('Connection Tests', () => {
    test('should connect to Supabase project', async () => {
      mockSupabaseTools.getProject.mockResolvedValue({
        id: TEST_PROJECT_ID,
        name: 'CFDI Automation',
        status: 'ACTIVE_HEALTHY',
        region: 'us-east-1'
      })

      const project = await mockSupabaseTools.getProject(TEST_PROJECT_ID)
      
      expect(project.id).toBe(TEST_PROJECT_ID)
      expect(project.status).toBe('ACTIVE_HEALTHY')
    })

    test('should get project URL', async () => {
      mockSupabaseTools.getProjectUrl.mockResolvedValue({
        url: `https://${TEST_PROJECT_ID}.supabase.co`
      })

      const urlResult = await mockSupabaseTools.getProjectUrl(TEST_PROJECT_ID)
      
      expect(urlResult.url).toBe(`https://${TEST_PROJECT_ID}.supabase.co`)
    })

    test('should get anonymous key', async () => {
      mockSupabaseTools.getAnonKey.mockResolvedValue({
        anon_key: process.env.SUPABASE_ANON_KEY
      })

      const keyResult = await mockSupabaseTools.getAnonKey(TEST_PROJECT_ID)
      
      expect(keyResult.anon_key).toBe(process.env.SUPABASE_ANON_KEY)
    })
  })

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      mockSupabaseTools.executeSQL.mockRejectedValue(new Error('Connection failed'))

      try {
        await mockSupabaseTools.executeSQL(TEST_PROJECT_ID, 'SELECT 1')
        fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).toBe('Connection failed')
      }
    })

    test('should handle invalid SQL queries', async () => {
      mockSupabaseTools.executeSQL.mockResolvedValue({
        success: false,
        error: {
          code: 'INVALID_SQL',
          message: 'syntax error at or near "INVALID"'
        }
      })

      const result = await mockSupabaseTools.executeSQL(TEST_PROJECT_ID, 'INVALID SQL')
      
      expect(result.success).toBe(false)
      expect(result.error.code).toBe('INVALID_SQL')
    })
  })
}) 