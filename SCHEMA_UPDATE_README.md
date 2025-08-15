# Database Schema Update: Adding Email and Phone Number Columns

## Overview
This update adds the missing `email` and `phone_number` columns to the `user_profiles` table, making `phone_number` a mandatory field. This resolves the schema mismatch that was preventing user registration from working properly.

## Changes Made

### 1. Database Schema Updates

#### Updated `supabase_schema.sql`
- Added `email VARCHAR(255) NOT NULL` column
- Added `phone_number VARCHAR(20) NOT NULL` column
- Updated `get_user_profile` function to include new columns
- Added column comments for documentation

#### New Migration File: `migration_add_email_phone.sql`
- Adds missing columns to existing databases
- Populates email from auth.users table for existing records
- Makes email NOT NULL after population
- Provides guidance for making phone_number NOT NULL

#### New Database Function: `create_user_profile_function.sql`
- Complete function that matches the new schema
- Includes proper error handling and validation
- Returns all profile fields including new columns
- Has proper security permissions

### 2. Frontend Updates

#### Updated `frontend/components/auth/RegisterForm.tsx`
- Made `phone_number` field mandatory in validation schema
- Added required asterisk (*) to phone number label
- Removed optional handling for phone_number

#### Updated `frontend/services/auth.ts`
- Removed optional handling for phone_number parameter
- Ensures email and phone_number are properly passed to database function

#### Updated `frontend/lib/supabase.ts`
- Made `phone_number` non-nullable in TypeScript types
- Updated Row, Insert, and Update interfaces
- Ensures type safety matches database schema

#### Updated `frontend/types/auth.ts`
- Made `phone_number` mandatory in RegisterData interface
- Made `phone_number` mandatory in UserProfile interface
- Removed optional (?) modifiers

## Implementation Steps

### Step 1: Update Database Schema
1. **For new databases**: Run the updated `supabase_schema.sql` file
2. **For existing databases**: Run the `migration_add_email_phone.sql` file

### Step 2: Create/Update Database Function
Run the `create_user_profile_function.sql` file to create the updated function

### Step 3: Update Frontend Code
The frontend files have already been updated with the necessary changes

### Step 4: Test Registration
1. Ensure all environment variables are properly set
2. Test user registration with the new mandatory phone number field
3. Verify that both email and phone number are stored in the database

## Database Schema Changes

### Before (Missing Columns)
```sql
CREATE TABLE public.user_profiles (
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
```

### After (With New Columns)
```sql
CREATE TABLE public.user_profiles (
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
    email VARCHAR(255) NOT NULL,           -- NEW: Mandatory email field
    phone_number VARCHAR(20) NOT NULL,     -- NEW: Mandatory phone number field
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Validation Changes

### Before
```typescript
phone_number: z.string().optional(),
```

### After
```typescript
phone_number: z.string().min(1, t('validation.phoneNumber.required')),
```

## Form Field Updates

### Before
```tsx
<Label htmlFor="phone_number">{t('register.phoneNumber.label')}</Label>
```

### After
```tsx
<Label htmlFor="phone_number">{t('register.phoneNumber.label')} *</Label>
```

## Type Safety Updates

### Before
```typescript
phone_number?: string | null
```

### After
```typescript
phone_number: string
```

## Benefits of These Changes

1. **Resolves Registration Issues**: Users can now register successfully
2. **Data Completeness**: Phone number is now mandatory and stored
3. **Type Safety**: TypeScript types match the actual database schema
4. **Consistency**: All form fields now properly align with database columns
5. **Validation**: Proper client-side validation for mandatory fields

## Testing Checklist

- [ ] Database schema updated with new columns
- [ ] Database function created/updated
- [ ] Frontend validation works for mandatory phone number
- [ ] User registration completes successfully
- [ ] Email and phone number are stored in database
- [ ] TypeScript compilation passes without errors
- [ ] Form validation prevents submission without phone number

## Troubleshooting

### Common Issues
1. **Migration fails**: Ensure you have proper permissions on the database
2. **Function creation fails**: Check if the function already exists and drop it first
3. **TypeScript errors**: Ensure all type files are updated consistently
4. **Registration still fails**: Verify the database function is callable by authenticated users

### Verification Queries
```sql
-- Check if columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'create_user_profile';
```

## Security Considerations

- The `create_user_profile` function uses `SECURITY DEFINER` for proper permissions
- Row Level Security (RLS) policies ensure users can only access their own data
- Input validation prevents malicious data insertion
- RFC validation ensures proper Mexican tax ID format

## Next Steps

1. Implement these changes in your development environment
2. Test thoroughly with various user registration scenarios
3. Deploy to staging environment for validation
4. Monitor for any issues during the transition
5. Update production environment during maintenance window
