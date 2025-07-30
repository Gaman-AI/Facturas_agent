-- Supabase Database Schema for CFDI Automation System
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table with your required fields
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    rfc VARCHAR(13) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL DEFAULT 'México',
    company_name VARCHAR(255) NOT NULL,
    street VARCHAR(255) NOT NULL,
    exterior_number VARCHAR(10) NOT NULL,
    interior_number VARCHAR(10),
    colony VARCHAR(100) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    state VARCHAR(100) NOT NULL,
    tax_regime VARCHAR(10) NOT NULL,
    cfdi_use VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cfdi_tasks table for task management
CREATE TABLE IF NOT EXISTS public.cfdi_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vendor_url TEXT NOT NULL,
    task_description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    result JSONB,
    metadata JSONB DEFAULT '{}',
    -- CFDI specific fields
    invoice_amount DECIMAL(10,2),
    invoice_folio VARCHAR(50),
    vendor_name VARCHAR(255),
    browser_session_id VARCHAR(255),
    browserbase_session_url TEXT
);

-- Create task_steps table for tracking automation steps
CREATE TABLE IF NOT EXISTS public.task_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.cfdi_tasks(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_type VARCHAR(50) NOT NULL CHECK (step_type IN ('thinking', 'action', 'observation', 'error', 'user_intervention')),
    step_description TEXT,
    step_data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_rfc ON public.user_profiles(rfc);
CREATE INDEX IF NOT EXISTS idx_cfdi_tasks_user_id ON public.cfdi_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_cfdi_tasks_status ON public.cfdi_tasks(status);
CREATE INDEX IF NOT EXISTS idx_cfdi_tasks_created_at ON public.cfdi_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_steps_task_id ON public.task_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_task_steps_step_number ON public.task_steps(task_id, step_number);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_profiles updated_at
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfdi_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;

-- User profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- CFDI tasks policies
DROP POLICY IF EXISTS "Users can view own tasks" ON public.cfdi_tasks;
CREATE POLICY "Users can view own tasks" ON public.cfdi_tasks
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own tasks" ON public.cfdi_tasks;
CREATE POLICY "Users can create own tasks" ON public.cfdi_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.cfdi_tasks;
CREATE POLICY "Users can update own tasks" ON public.cfdi_tasks
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.cfdi_tasks;
CREATE POLICY "Users can delete own tasks" ON public.cfdi_tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Task steps policies (inherit from tasks)
DROP POLICY IF EXISTS "Users can view steps of own tasks" ON public.task_steps;
CREATE POLICY "Users can view steps of own tasks" ON public.task_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cfdi_tasks 
            WHERE cfdi_tasks.id = task_steps.task_id 
            AND cfdi_tasks.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create steps for own tasks" ON public.task_steps;
CREATE POLICY "Users can create steps for own tasks" ON public.task_steps
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cfdi_tasks 
            WHERE cfdi_tasks.id = task_steps.task_id 
            AND cfdi_tasks.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update steps of own tasks" ON public.task_steps;
CREATE POLICY "Users can update steps of own tasks" ON public.task_steps
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.cfdi_tasks 
            WHERE cfdi_tasks.id = task_steps.task_id 
            AND cfdi_tasks.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create a function to get user profile with fallback
CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    id UUID,
    user_id UUID,
    rfc VARCHAR,
    country VARCHAR,
    company_name VARCHAR,
    street VARCHAR,
    exterior_number VARCHAR,
    interior_number VARCHAR,
    colony VARCHAR,
    municipality VARCHAR,
    zip_code VARCHAR,
    state VARCHAR,
    tax_regime VARCHAR,
    cfdi_use VARCHAR,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.rfc,
        p.country,
        p.company_name,
        p.street,
        p.exterior_number,
        p.interior_number,
        p.colony,
        p.municipality,
        p.zip_code,
        p.state,
        p.tax_regime,
        p.cfdi_use,
        p.created_at,
        p.updated_at
    FROM public.user_profiles p
    WHERE p.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate RFC format
CREATE OR REPLACE FUNCTION public.validate_rfc(rfc_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Mexican RFC validation
    -- Persona Física: 4 letters + 6 numbers + 3 alphanumeric (13 chars total)
    -- Persona Moral: 3 letters + 6 numbers + 3 alphanumeric (12 chars total)
    RETURN rfc_input ~ '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$' AND length(rfc_input) BETWEEN 12 AND 13;
END;
$$ LANGUAGE plpgsql;

-- Add RFC validation constraint
ALTER TABLE public.user_profiles 
ADD CONSTRAINT check_rfc_format 
CHECK (public.validate_rfc(rfc));

COMMENT ON TABLE public.user_profiles IS 'User profiles with CFDI-specific information';
COMMENT ON TABLE public.cfdi_tasks IS 'CFDI automation tasks';
COMMENT ON TABLE public.task_steps IS 'Individual steps within CFDI automation tasks';

COMMENT ON COLUMN public.user_profiles.rfc IS 'Mexican RFC (Tax ID) - 12-13 characters';
COMMENT ON COLUMN public.user_profiles.country IS 'Country, defaults to México';
COMMENT ON COLUMN public.user_profiles.company_name IS 'Company name / Razón Social';
COMMENT ON COLUMN public.user_profiles.tax_regime IS 'SAT Tax Regime code (e.g., 601, 612, etc.)';
COMMENT ON COLUMN public.user_profiles.cfdi_use IS 'CFDI Use code (e.g., G01, G03, etc.)';

-- Insert some test data (optional - remove for production)
-- INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com');
-- INSERT INTO public.user_profiles (user_id, rfc, company_name, street, exterior_number, colony, municipality, zip_code, state, tax_regime, cfdi_use) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'XAXX010101000', 'Test Company S.A. de C.V.', 'Av. Insurgentes Sur', '1234', 'Del Valle', 'Benito Juárez', '03100', 'Ciudad de México', '601', 'G01'); 