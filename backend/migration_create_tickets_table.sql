-- Migration: Create tickets table for ticket history functionality
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'uploaded',
    processing_status VARCHAR(50) DEFAULT 'pending',
    comercio VARCHAR(255),
    total DECIMAL(15,2),
    fecha DATE,
    mesa_folio VARCHAR(100),
    id_ticket VARCHAR(100),
    store_branch_plaza VARCHAR(255),
    payment_type VARCHAR(100),
    tc_number VARCHAR(100),
    ticket_id VARCHAR(100),
    register_station_terminal VARCHAR(100),
    card_last_4_digits VARCHAR(4),
    tr_number VARCHAR(100),
    fol_vta VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_comercio ON public.tickets(comercio);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
CREATE POLICY "Users can view own tickets" ON public.tickets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tickets" ON public.tickets;
CREATE POLICY "Users can insert own tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tickets" ON public.tickets;
CREATE POLICY "Users can update own tickets" ON public.tickets
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tickets" ON public.tickets;
CREATE POLICY "Users can delete own tickets" ON public.tickets
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.tickets TO anon, authenticated;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS trigger_tickets_updated_at ON public.tickets;
CREATE TRIGGER trigger_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comments
COMMENT ON TABLE public.tickets IS 'Uploaded ticket/invoice files with OCR processing results';
COMMENT ON COLUMN public.tickets.file_url IS 'Supabase Storage URL for the uploaded file';
COMMENT ON COLUMN public.tickets.comercio IS 'Store/vendor name extracted from OCR';
COMMENT ON COLUMN public.tickets.total IS 'Total amount extracted from ticket';
