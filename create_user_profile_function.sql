-- Create or replace the create_user_profile function
-- This function creates a user profile with all required CFDI fields
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.create_user_profile(
    p_user_id UUID,
    p_rfc VARCHAR(13),
    p_country VARCHAR(100),
    p_company_name VARCHAR(255),
    p_street VARCHAR(255),
    p_exterior_number VARCHAR(10),
    p_interior_number VARCHAR(10),
    p_colony VARCHAR(100),
    p_municipality VARCHAR(100),
    p_zip_code VARCHAR(10),
    p_state VARCHAR(100),
    p_tax_regime VARCHAR(10),
    p_cfdi_use VARCHAR(10),
    p_email VARCHAR(255),
    p_phone_number VARCHAR(20)
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    rfc VARCHAR(13),
    country VARCHAR(100),
    company_name VARCHAR(255),
    street VARCHAR(255),
    exterior_number VARCHAR(10),
    interior_number VARCHAR(10),
    colony VARCHAR(100),
    municipality VARCHAR(100),
    zip_code VARCHAR(10),
    state VARCHAR(100),
    tax_regime VARCHAR(10),
    cfdi_use VARCHAR(10),
    email VARCHAR(255),
    phone_number VARCHAR(20),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Check if user profile already exists
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User profile already exists for user ID: %', p_user_id;
    END IF;
    
    -- Check if RFC is already registered
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE rfc = p_rfc) THEN
        RAISE EXCEPTION 'RFC % is already registered by another user', p_rfc;
    END IF;
    
    -- Validate RFC format
    IF NOT public.validate_rfc(p_rfc) THEN
        RAISE EXCEPTION 'Invalid RFC format: %. RFC must be 12-13 characters and follow Mexican RFC pattern', p_rfc;
    END IF;
    
    -- Insert new user profile
    INSERT INTO public.user_profiles (
        user_id,
        rfc,
        country,
        company_name,
        street,
        exterior_number,
        interior_number,
        colony,
        municipality,
        zip_code,
        state,
        tax_regime,
        cfdi_use,
        email,
        phone_number
    ) VALUES (
        p_user_id,
        p_rfc,
        p_country,
        p_company_name,
        p_street,
        p_exterior_number,
        p_interior_number,
        p_colony,
        p_municipality,
        p_zip_code,
        p_state,
        p_tax_regime,
        p_cfdi_use,
        p_email,
        p_phone_number
    ) RETURNING id INTO v_profile_id;
    
    -- Return the created profile
    RETURN QUERY
    SELECT 
        up.id,
        up.user_id,
        up.rfc,
        up.country,
        up.company_name,
        up.street,
        up.exterior_number,
        up.interior_number,
        up.colony,
        up.municipality,
        up.zip_code,
        up.state,
        up.tax_regime,
        up.cfdi_use,
        up.email,
        up.phone_number,
        up.created_at,
        up.updated_at
    FROM public.user_profiles up
    WHERE up.id = v_profile_id;
    
EXCEPTION
    WHEN unique_violation THEN
        IF SQLERRM LIKE '%rfc%' THEN
            RAISE EXCEPTION 'RFC % is already registered by another user', p_rfc;
        ELSIF SQLERRM LIKE '%user_id%' THEN
            RAISE EXCEPTION 'User profile already exists for user ID: %', p_user_id;
        ELSE
            RAISE EXCEPTION 'Duplicate record violation: %', SQLERRM;
        END IF;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating user profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_user_profile IS 'Creates a new user profile with CFDI-specific information including email and phone number';
