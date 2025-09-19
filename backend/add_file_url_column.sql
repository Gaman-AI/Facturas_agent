-- Add file_url column to tickets table if it doesn't exist
-- Run this in your Supabase SQL Editor

-- Check if the column exists and add it if it doesn't
DO $$ 
BEGIN
    -- Check if file_url column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tickets' 
        AND column_name = 'file_url'
        AND table_schema = 'public'
    ) THEN
        -- Add the file_url column
        ALTER TABLE public.tickets ADD COLUMN file_url TEXT;
        
        -- Add comment
        COMMENT ON COLUMN public.tickets.file_url IS 'Supabase Storage URL for the uploaded file';
        
        RAISE NOTICE 'file_url column added successfully';
    ELSE
        RAISE NOTICE 'file_url column already exists';
    END IF;
END $$;
