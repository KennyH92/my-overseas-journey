-- Add is_first_login column to profiles table for force password change
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_first_login boolean DEFAULT true;

-- Add employee_id column to profiles for storing staff ID (TSSB format)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS employee_id text UNIQUE;

-- Create function to generate next staff ID in TSSB00001 format
CREATE OR REPLACE FUNCTION public.generate_next_staff_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_num integer;
  next_num integer;
  next_id text;
BEGIN
  -- Find the maximum number from existing employee_ids with TSSB prefix
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_id FROM 5) AS integer)), 0)
  INTO max_num
  FROM public.profiles
  WHERE employee_id ~ '^TSSB[0-9]{5}$';
  
  -- Calculate next number
  next_num := max_num + 1;
  
  -- Format with leading zeros (5 digits)
  next_id := 'TSSB' || LPAD(next_num::text, 5, '0');
  
  RETURN next_id;
END;
$$;

-- Create function to register a new guard with auto-generated staff ID
-- This is called after the auth.users entry is created
CREATE OR REPLACE FUNCTION public.setup_guard_profile(
  _user_id uuid,
  _full_name text,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL
)
RETURNS TABLE(employee_id text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_employee_id text;
BEGIN
  -- Generate the next staff ID
  new_employee_id := public.generate_next_staff_id();
  
  -- Update the profile with the generated employee_id
  UPDATE public.profiles
  SET 
    employee_id = new_employee_id,
    full_name = _full_name,
    phone = _phone,
    email = _email,
    is_first_login = true,
    updated_at = now()
  WHERE id = _user_id;
  
  -- Return the generated info
  RETURN QUERY SELECT new_employee_id, _full_name;
END;
$$;

-- Grant execute permission to authenticated users (admins will use RLS to control access)
GRANT EXECUTE ON FUNCTION public.generate_next_staff_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_guard_profile(uuid, text, text, text) TO authenticated;