
-- Create site_attendance table for dynamic QR check-in/out
CREATE TABLE public.site_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_time TIMESTAMPTZ,
  check_in_latitude NUMERIC,
  check_in_longitude NUMERIC,
  check_out_latitude NUMERIC,
  check_out_longitude NUMERIC,
  status TEXT NOT NULL DEFAULT 'checked_in',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(guard_id, site_id, date)
);

-- Enable RLS
ALTER TABLE public.site_attendance ENABLE ROW LEVEL SECURITY;

-- Guards can view their own attendance
CREATE POLICY "Guards can view own site attendance"
ON public.site_attendance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM guards WHERE guards.id = site_attendance.guard_id AND guards.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- Guards can check in (insert)
CREATE POLICY "Guards can check in"
ON public.site_attendance
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guards WHERE guards.id = site_attendance.guard_id AND guards.user_id = auth.uid()
  )
);

-- Guards can check out (update their own records)
CREATE POLICY "Guards can check out"
ON public.site_attendance
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM guards WHERE guards.id = site_attendance.guard_id AND guards.user_id = auth.uid()
  )
);

-- Admins and managers can manage all records
CREATE POLICY "Admins and managers can manage site attendance"
ON public.site_attendance
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
