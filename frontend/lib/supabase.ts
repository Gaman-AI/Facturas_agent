import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const createSupabaseClient = () => supabase

export const TABLES = {
  USER_PROFILES: 'user_profiles',
  CFDI_TASKS: 'cfdi_tasks',
  TASK_STEPS: 'task_steps'
} as const

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string | null
          rfc: string
          country: string
          company_name: string
          street: string
          exterior_number: string
          interior_number: string | null
          colony: string
          municipality: string
          zip_code: string
          state: string
          tax_regime: string
          cfdi_use: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          rfc: string
          country?: string
          company_name: string
          street: string
          exterior_number: string
          interior_number?: string | null
          colony: string
          municipality: string
          zip_code: string
          state: string
          tax_regime: string
          cfdi_use: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          rfc?: string
          country?: string
          company_name?: string
          street?: string
          exterior_number?: string
          interior_number?: string | null
          colony?: string
          municipality?: string
          zip_code?: string
          state?: string
          tax_regime?: string
          cfdi_use?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      cfdi_tasks: {
        Row: {
          id: string
          user_id: string | null
          vendor_url: string
          task_description: string
          status: string
          created_at: string | null
          completed_at: string | null
          error_message: string | null
          result: any | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          vendor_url: string
          task_description: string
          status?: string
          created_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          result?: any | null
        }
        Update: {
          id?: string
          user_id?: string | null
          vendor_url?: string
          task_description?: string
          status?: string
          created_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          result?: any | null
        }
      }
    }
  }
} 