-- Add new profile fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS id_number text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS is_foreign_employee boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS passport_expiry_date date,
ADD COLUMN IF NOT EXISTS work_permit_expiry_date date;