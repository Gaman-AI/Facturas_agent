-- CORRECTED Supabase Database Schema for CFDI Automation System
-- This schema matches our TaskService implementation
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USER PROFILES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT,
    rfc VARCHAR(13) NOT NULL,
    fiscal_regime VARCHAR(10) NOT NULL,
    postal_code VARCHAR(5) NOT NULL,
    company_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- AUTOMATION TASKS TABLE (matches TaskService)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.automation_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'PAUSED', 'INTERVENTION_NEEDED', 'COMPLETED', 'FAILED')),
    vendor_url TEXT NOT NULL,
    ticket_details JSONB NOT NULL DEFAULT '{}',
    current_live_url TEXT,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- TASK STEPS TABLE (matches TaskService)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.task_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.automation_tasks(id) ON DELETE CASCADE,
    step_type VARCHAR(20) NOT NULL CHECK (step_type IN ('navigate', 'input', 'click', 'thinking', 'error', 'user_intervention', 'completed')),
    content JSONB NOT NULL DEFAULT '{}',
    screenshot_url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_ms INTEGER
);

-- =============================================================================
-- BROWSER SESSIONS TABLE (for future Browserbase integration)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.browser_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.automation_tasks(id) ON DELETE CASCADE,
    browserbase_session_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'user_controlled', 'terminated')),
    live_view_url TEXT,
    takeover_url TEXT,
    session_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    terminated_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- USER VENDOR CREDENTIALS TABLE (for stored credentials)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_vendor_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vendor_domain VARCHAR(255) NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    additional_fields JSONB DEFAULT '{}',
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_rfc ON public.user_profiles(rfc);

CREATE INDEX IF NOT EXISTS idx_automation_tasks_user_id ON public.automation_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_status ON public.automation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_created_at ON public.automation_tasks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_steps_task_id ON public.task_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_task_steps_timestamp ON public.task_steps(task_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_browser_sessions_task_id ON public.browser_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_user_vendor_credentials_user_id ON public.user_vendor_credentials(user_id);

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_automation_tasks_updated_at ON public.automation_tasks;
CREATE TRIGGER trigger_automation_tasks_updated_at
    BEFORE UPDATE ON public.automation_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_user_vendor_credentials_updated_at ON public.user_vendor_credentials;
CREATE TRIGGER trigger_user_vendor_credentials_updated_at
    BEFORE UPDATE ON public.user_vendor_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vendor_credentials ENABLE ROW LEVEL SECURITY;

-- User profiles policies
DROP POLICY IF EXISTS "Users can access own profile" ON public.user_profiles;
CREATE POLICY "Users can access own profile" ON public.user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Automation tasks policies
DROP POLICY IF EXISTS "Users can access own tasks" ON public.automation_tasks;
CREATE POLICY "Users can access own tasks" ON public.automation_tasks
    FOR ALL USING (auth.uid() = user_id);

-- Task steps policies (inherit from tasks)
DROP POLICY IF EXISTS "Users can access steps of own tasks" ON public.task_steps;
CREATE POLICY "Users can access steps of own tasks" ON public.task_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.automation_tasks 
            WHERE automation_tasks.id = task_steps.task_id 
            AND automation_tasks.user_id = auth.uid()
        )
    );

-- Browser sessions policies
DROP POLICY IF EXISTS "Users can access sessions of own tasks" ON public.browser_sessions;
CREATE POLICY "Users can access sessions of own tasks" ON public.browser_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.automation_tasks 
            WHERE automation_tasks.id = browser_sessions.task_id 
            AND automation_tasks.user_id = auth.uid()
        )
    );

-- User vendor credentials policies
DROP POLICY IF EXISTS "Users can access own credentials" ON public.user_vendor_credentials;
CREATE POLICY "Users can access own credentials" ON public.user_vendor_credentials
    FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =============================================================================
-- HELPFUL FUNCTIONS
-- =============================================================================

-- Function to get user task statistics
CREATE OR REPLACE FUNCTION public.get_user_task_stats(user_uuid UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_tasks', COUNT(*),
        'completed_tasks', COUNT(*) FILTER (WHERE status = 'COMPLETED'),
        'failed_tasks', COUNT(*) FILTER (WHERE status = 'FAILED'),
        'pending_tasks', COUNT(*) FILTER (WHERE status = 'PENDING'),
        'running_tasks', COUNT(*) FILTER (WHERE status = 'RUNNING'),
        'paused_tasks', COUNT(*) FILTER (WHERE status = 'PAUSED')
    ) INTO result
    FROM public.automation_tasks
    WHERE user_id = user_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================
COMMENT ON TABLE public.user_profiles IS 'User profiles with CFDI-specific information';
COMMENT ON TABLE public.automation_tasks IS 'CFDI automation tasks managed by the system';
COMMENT ON TABLE public.task_steps IS 'Individual steps within automation tasks for transparency';
COMMENT ON TABLE public.browser_sessions IS 'Browserbase session management for live automation';
COMMENT ON TABLE public.user_vendor_credentials IS 'Encrypted vendor portal credentials';

COMMENT ON COLUMN public.automation_tasks.status IS 'Task status: PENDING, RUNNING, PAUSED, INTERVENTION_NEEDED, COMPLETED, FAILED';
COMMENT ON COLUMN public.task_steps.step_type IS 'Step type: navigate, input, click, thinking, error, user_intervention, completed';
COMMENT ON COLUMN public.user_profiles.rfc IS 'Mexican RFC (Tax ID) - 12-13 characters';
COMMENT ON COLUMN public.user_profiles.fiscal_regime IS 'SAT Tax Regime code (e.g., 601, 612, etc.)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'CFDI Automation Database Schema Created Successfully!';
    RAISE NOTICE 'Tables created: user_profiles, automation_tasks, task_steps, browser_sessions, user_vendor_credentials';
    RAISE NOTICE 'Ready for TaskService integration.';
END $$; 