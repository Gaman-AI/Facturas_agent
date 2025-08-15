-- Migration: Add email and phone_number columns to user_profiles table
-- Run this in your Supabase SQL Editor to update existing databases

-- Add missing columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Update existing records to set default values for email
-- This will populate email from auth.users table for existing profiles
UPDATE public.user_profiles 
SET email = (
    SELECT au.email 
    FROM auth.users au 
    WHERE au.id = user_profiles.user_id
)
WHERE email IS NULL;

-- Make email column NOT NULL after populating existing records
ALTER TABLE public.user_profiles 
ALTER COLUMN email SET NOT NULL;

-- Make phone_number column NOT NULL (this will require manual input for existing records)
-- Note: You may need to manually update existing records with phone numbers before running this
-- ALTER TABLE public.user_profiles ALTER COLUMN phone_number SET NOT NULL;

-- Add comments for the new columns
COMMENT ON COLUMN public.user_profiles.email IS 'User email address for CFDI operations';
COMMENT ON COLUMN public.user_profiles.phone_number IS 'User phone number for CFDI operations (mandatory)';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Added email and phone_number columns to user_profiles table';
    RAISE NOTICE 'Note: phone_number is currently nullable - make it NOT NULL after populating existing records';
END $$;
