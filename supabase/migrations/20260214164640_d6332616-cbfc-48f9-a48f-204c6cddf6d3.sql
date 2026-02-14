
-- Add auto_closed_at column to site_attendance for tracking system auto-close time
ALTER TABLE public.site_attendance 
ADD COLUMN auto_closed_at timestamp with time zone DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.site_attendance.auto_closed_at IS 'Timestamp when the system auto-closed this record (for records >16h without check-out)';
