-- Performance Tracking Database Schema
-- Additional tables for comprehensive performance monitoring

-- OCR Performance Logs Table
CREATE TABLE IF NOT EXISTS public.ocr_performance_logs (
    id VARCHAR(50) PRIMARY KEY,
    vendor_type VARCHAR(50) NOT NULL,
    processing_time_ms INTEGER NOT NULL,
    accuracy_percentage DECIMAL(5,2),
    extracted_data JSONB,
    expected_data JSONB,
    ocr_confidence DECIMAL(5,2),
    extraction_method VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Performance Statistics Table
CREATE TABLE IF NOT EXISTS public.vendor_performance_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_type VARCHAR(50) UNIQUE NOT NULL,
    total_processing_count INTEGER DEFAULT 0,
    average_processing_time DECIMAL(10,2) DEFAULT 0,
    average_accuracy DECIMAL(5,2) DEFAULT 0,
    last_processing_time INTEGER,
    last_accuracy DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Performance Metrics Table
CREATE TABLE IF NOT EXISTS public.system_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL, -- 'processing_time', 'success_rate', 'throughput', etc.
    metric_value DECIMAL(10,2) NOT NULL,
    metric_unit VARCHAR(20), -- 'ms', 'percentage', 'count', etc.
    vendor_type VARCHAR(50),
    time_period VARCHAR(20), -- 'hour', 'day', 'week', 'month'
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error Tracking Table
CREATE TABLE IF NOT EXISTS public.error_tracking_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT,
    error_code VARCHAR(50),
    vendor_type VARCHAR(50),
    task_id UUID REFERENCES public.tasks(id),
    resolution_time_ms INTEGER,
    resolution_method VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Performance Alerts Table
CREATE TABLE IF NOT EXISTS public.performance_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'threshold_exceeded', 'error_rate_high', etc.
    metric_name VARCHAR(100) NOT NULL,
    current_value DECIMAL(10,2) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    message TEXT NOT NULL,
    vendor_type VARCHAR(50),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Trends Table (for historical analysis)
CREATE TABLE IF NOT EXISTS public.performance_trends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trend_type VARCHAR(50) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    vendor_type VARCHAR(50),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ocr_performance_logs_vendor_type ON public.ocr_performance_logs(vendor_type);
CREATE INDEX IF NOT EXISTS idx_ocr_performance_logs_created_at ON public.ocr_performance_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_performance_logs_accuracy ON public.ocr_performance_logs(accuracy_percentage);
CREATE INDEX IF NOT EXISTS idx_ocr_performance_logs_processing_time ON public.ocr_performance_logs(processing_time_ms);

CREATE INDEX IF NOT EXISTS idx_vendor_performance_stats_vendor_type ON public.vendor_performance_stats(vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendor_performance_stats_updated_at ON public.vendor_performance_stats(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_performance_metrics_type ON public.system_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_performance_metrics_recorded_at ON public.system_performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_performance_metrics_vendor_type ON public.system_performance_metrics(vendor_type);

CREATE INDEX IF NOT EXISTS idx_error_tracking_logs_type ON public.error_tracking_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_tracking_logs_created_at ON public.error_tracking_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_tracking_logs_vendor_type ON public.error_tracking_logs(vendor_type);
CREATE INDEX IF NOT EXISTS idx_error_tracking_logs_task_id ON public.error_tracking_logs(task_id);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_type ON public.performance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity ON public.performance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_acknowledged ON public.performance_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_created_at ON public.performance_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_trends_type ON public.performance_trends(trend_type);
CREATE INDEX IF NOT EXISTS idx_performance_trends_metric_name ON public.performance_trends(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_trends_period_start ON public.performance_trends(period_start);
CREATE INDEX IF NOT EXISTS idx_performance_trends_vendor_type ON public.performance_trends(vendor_type);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_vendor_performance_stats_updated_at ON public.vendor_performance_stats;
CREATE TRIGGER trigger_vendor_performance_stats_updated_at
    BEFORE UPDATE ON public.vendor_performance_stats
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE public.ocr_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_performance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_tracking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_trends ENABLE ROW LEVEL SECURITY;

-- OCR Performance Logs policies
DROP POLICY IF EXISTS "Users can view OCR performance logs" ON public.ocr_performance_logs;
CREATE POLICY "Users can view OCR performance logs" ON public.ocr_performance_logs
    FOR SELECT USING (true); -- Allow all authenticated users to view performance data

-- Vendor Performance Stats policies
DROP POLICY IF EXISTS "Users can view vendor performance stats" ON public.vendor_performance_stats;
CREATE POLICY "Users can view vendor performance stats" ON public.vendor_performance_stats
    FOR SELECT USING (true); -- Allow all authenticated users to view stats

-- System Performance Metrics policies
DROP POLICY IF EXISTS "Users can view system performance metrics" ON public.system_performance_metrics;
CREATE POLICY "Users can view system performance metrics" ON public.system_performance_metrics
    FOR SELECT USING (true); -- Allow all authenticated users to view metrics

-- Error Tracking Logs policies
DROP POLICY IF EXISTS "Users can view error tracking logs" ON public.error_tracking_logs;
CREATE POLICY "Users can view error tracking logs" ON public.error_tracking_logs
    FOR SELECT USING (true); -- Allow all authenticated users to view error logs

-- Performance Alerts policies
DROP POLICY IF EXISTS "Users can view performance alerts" ON public.performance_alerts;
CREATE POLICY "Users can view performance alerts" ON public.performance_alerts
    FOR SELECT USING (true); -- Allow all authenticated users to view alerts

DROP POLICY IF EXISTS "Users can update performance alerts" ON public.performance_alerts;
CREATE POLICY "Users can update performance alerts" ON public.performance_alerts
    FOR UPDATE USING (true); -- Allow all authenticated users to acknowledge alerts

-- Performance Trends policies
DROP POLICY IF EXISTS "Users can view performance trends" ON public.performance_trends;
CREATE POLICY "Users can view performance trends" ON public.performance_trends
    FOR SELECT USING (true); -- Allow all authenticated users to view trends

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create performance monitoring functions

-- Function to get vendor performance summary
CREATE OR REPLACE FUNCTION public.get_vendor_performance_summary()
RETURNS TABLE (
    vendor_type VARCHAR,
    total_count BIGINT,
    avg_processing_time DECIMAL,
    avg_accuracy DECIMAL,
    success_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vps.vendor_type,
        vps.total_processing_count::BIGINT,
        vps.average_processing_time,
        vps.average_accuracy,
        CASE 
            WHEN vps.total_processing_count > 0 THEN 
                (SELECT COUNT(*)::DECIMAL / vps.total_processing_count * 100 
                 FROM public.ocr_performance_logs opl 
                 WHERE opl.vendor_type = vps.vendor_type 
                 AND opl.accuracy_percentage >= 85)
            ELSE 0 
        END as success_rate
    FROM public.vendor_performance_stats vps
    ORDER BY vps.average_accuracy DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get performance trends
CREATE OR REPLACE FUNCTION public.get_performance_trends(
    trend_type_param VARCHAR DEFAULT 'daily',
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    metric_name VARCHAR,
    metric_value DECIMAL,
    vendor_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.period_start,
        pt.period_end,
        pt.metric_name,
        pt.metric_value,
        pt.vendor_type
    FROM public.performance_trends pt
    WHERE pt.trend_type = trend_type_param
    AND pt.period_start >= NOW() - INTERVAL '1 day' * days_back
    ORDER BY pt.period_start DESC, pt.metric_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get error analysis
CREATE OR REPLACE FUNCTION public.get_error_analysis(
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    error_type VARCHAR,
    error_count BIGINT,
    avg_resolution_time DECIMAL,
    vendor_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        etl.error_type,
        COUNT(*)::BIGINT as error_count,
        AVG(etl.resolution_time_ms)::DECIMAL as avg_resolution_time,
        etl.vendor_type
    FROM public.error_tracking_logs etl
    WHERE etl.created_at >= NOW() - INTERVAL '1 day' * days_back
    GROUP BY etl.error_type, etl.vendor_type
    ORDER BY error_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active alerts
CREATE OR REPLACE FUNCTION public.get_active_alerts()
RETURNS TABLE (
    alert_id UUID,
    alert_type VARCHAR,
    metric_name VARCHAR,
    current_value DECIMAL,
    threshold_value DECIMAL,
    severity VARCHAR,
    message TEXT,
    vendor_type VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.id,
        pa.alert_type,
        pa.metric_name,
        pa.current_value,
        pa.threshold_value,
        pa.severity,
        pa.message,
        pa.vendor_type,
        pa.created_at
    FROM public.performance_alerts pa
    WHERE pa.acknowledged = FALSE
    ORDER BY 
        CASE pa.severity 
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END,
        pa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE public.ocr_performance_logs IS 'Detailed logs of OCR processing performance and accuracy';
COMMENT ON TABLE public.vendor_performance_stats IS 'Aggregated performance statistics by vendor type';
COMMENT ON TABLE public.system_performance_metrics IS 'System-wide performance metrics over time';
COMMENT ON TABLE public.error_tracking_logs IS 'Comprehensive error tracking and resolution metrics';
COMMENT ON TABLE public.performance_alerts IS 'Performance threshold alerts and notifications';
COMMENT ON TABLE public.performance_trends IS 'Historical performance trends for analysis';

COMMENT ON FUNCTION public.get_vendor_performance_summary() IS 'Get summary of vendor performance statistics';
COMMENT ON FUNCTION public.get_performance_trends(VARCHAR, INTEGER) IS 'Get performance trends for specified time period';
COMMENT ON FUNCTION public.get_error_analysis(INTEGER) IS 'Get error analysis for specified time period';
COMMENT ON FUNCTION public.get_active_alerts() IS 'Get all unacknowledged performance alerts';
