
-- Add index for fast lookup of expiring work permits
CREATE INDEX IF NOT EXISTS idx_profiles_permit_expiry ON public.profiles(work_permit_expiry_date);

-- Add index for passport expiry as well
CREATE INDEX IF NOT EXISTS idx_profiles_passport_expiry ON public.profiles(passport_expiry_date);
