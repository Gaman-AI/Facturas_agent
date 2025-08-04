import { z } from 'zod'

/**
 * Validation middleware factory
 * Creates middleware that validates request data against Zod schemas
 */
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validate based on schema structure
      const validatedData = {}
      
      // Validate body if schema has body
      if (schema.body) {
        validatedData.body = schema.body.parse(req.body)
        req.body = validatedData.body
      }
      
      // Validate query parameters if schema has query
      if (schema.query) {
        validatedData.query = schema.query.parse(req.query)
        req.query = validatedData.query
      }
      
      // Validate path parameters if schema has params
      if (schema.params) {
        validatedData.params = schema.params.parse(req.params)
        req.params = validatedData.params
      }
      
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
        
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errorMessages
          }
        })
      }
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_SYSTEM_ERROR',
          message: 'Validation system error'
        }
      })
    }
  }
}

// Common validation schemas
export const schemas = {
  // User registration schema
  register: {
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      rfc: z.string().regex(
        /^[A-ZÑ&]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/,
        'Invalid RFC format'
      ),
      fiscal_regime: z.enum(['601', '603', '605', '606', '608', '610', '611', '612', '614', '616', '620', '621', '622', '623', '624', '625', '626']),
      postal_code: z.string().regex(/^[0-9]{5}$/, 'Invalid postal code'),
      company_name: z.string().min(1, 'Company name is required').optional()
    })
  },
  
  // User login schema
  login: {
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required')
    })
  },
  
  // Task creation schema - simplified for any task string
  createTask: {
    body: z.object({
      task: z.string().min(10, 'Task description must be at least 10 characters'),
      model: z.string().optional(),
      llm_provider: z.enum(['openai', 'anthropic', 'google']).default('openai').optional(),
      timeout_minutes: z.number().int().min(5).max(60).default(30).optional()
    })
  },
  
  // Task query parameters schema
  taskQuery: {
    query: z.object({
      page: z.string().regex(/^[1-9]\d*$/, 'Page must be positive integer').transform(Number).default('1'),
      limit: z.string().regex(/^[1-9]\d*$/, 'Limit must be positive integer').transform(Number).default('10'),
      status: z.enum(['PENDING', 'RUNNING', 'PAUSED', 'INTERVENTION_NEEDED', 'COMPLETED', 'FAILED']).optional()
    })
  },

  // Task ID parameter schema
  taskParams: {
    params: z.object({
      taskId: z.string().min(1, 'Task ID is required')
    })
  },

  // CFDI specific validation
  cfdiData: {
    body: z.object({
      customer_details: z.object({
        rfc: z.string().regex(
          /^[A-ZÑ&]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/,
          'Invalid RFC format'
        ),
        email: z.string().email('Invalid email format'),
        company_name: z.string().min(1, 'Company name is required'),
        fiscal_regime: z.string().optional(),
        address: z.object({
          street: z.string(),
          exterior_number: z.string(),
          interior_number: z.string().optional(),
          colony: z.string(),
          municipality: z.string(),
          state: z.string(),
          postal_code: z.string().regex(/^[0-9]{5}$/, 'Invalid postal code')
        }).optional()
      }),
      invoice_details: z.object({
        ticket_id: z.string().min(1, 'Ticket ID is required'),
        folio: z.string().optional(),
        transaction_date: z.string().optional(),
        subtotal: z.number().positive().optional(),
        iva: z.number().nonnegative().optional(),
        total: z.number().positive('Total amount is required'),
        currency: z.string().default('MXN')
      }),
      vendor_url: z.string().url('Invalid vendor URL'),
      automation_config: z.object({
        llm_provider: z.enum(['openai', 'anthropic', 'google']).default('openai'),
        model: z.string().optional(),
        max_retries: z.number().int().min(1).max(5).default(3),
        timeout_minutes: z.number().int().min(5).max(60).default(30)
      }).optional()
    })
  }
}

/**
 * Quick validation helper for specific schemas
 */
export const validateRegister = validate(schemas.register)
export const validateLogin = validate(schemas.login)
export const validateCreateTask = validate(schemas.createTask)
export const validateTaskQuery = validate(schemas.taskQuery)
export const validateTaskParams = validate(schemas.taskParams)
export const validateCFDIData = validate(schemas.cfdiData) 