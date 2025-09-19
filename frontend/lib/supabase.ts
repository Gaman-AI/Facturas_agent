import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create client if we have valid URLs
export const supabase = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_url' && supabaseAnonKey !== 'your_supabase_anon_key'
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const createSupabaseClient = () => supabase

export const TABLES = {
  USER_PROFILES: 'user_profiles',
  CFDI_TASKS: 'cfdi_tasks',
  TASK_STEPS: 'task_steps',
  TICKETS: 'tickets'
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
          email: string
          phone_number: string
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
          email: string
          phone_number: string
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
          email?: string
          phone_number?: string
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
      tickets: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          status: string
          processing_status: string
          created_at: string | null
          updated_at: string | null
          error_message: string | null
          mesa_folio: string | null
          id_ticket: string | null
          store_branch_plaza: string | null
          payment_type: string | null
          tc_number: string | null
          ticket_id: string | null
          fecha: string | null
          total: number | null
          register_station_terminal: string | null
          card_last_4_digits: string | null
          tr_number: string | null
          fol_vta: string | null
          comercio: string | null
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          status?: string
          processing_status?: string
          created_at?: string | null
          updated_at?: string | null
          error_message?: string | null
          mesa_folio?: string | null
          id_ticket?: string | null
          store_branch_plaza?: string | null
          payment_type?: string | null
          tc_number?: string | null
          ticket_id?: string | null
          fecha?: string | null
          total?: number | null
          register_station_terminal?: string | null
          card_last_4_digits?: string | null
          tr_number?: string | null
          fol_vta?: string | null
          comercio?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          status?: string
          processing_status?: string
          created_at?: string | null
          updated_at?: string | null
          error_message?: string | null
          mesa_folio?: string | null
          id_ticket?: string | null
          store_branch_plaza?: string | null
          payment_type?: string | null
          tc_number?: string | null
          ticket_id?: string | null
          fecha?: string | null
          total?: number | null
          register_station_terminal?: string | null
          card_last_4_digits?: string | null
          tr_number?: string | null
          fol_vta?: string | null
          comercio?: string | null
        }
      }
    }
  }
} 