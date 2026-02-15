
-- Step 1: Drop ALL RLS policies that reference the guards table FIRST

-- patrol_reports policies referencing guards
DROP POLICY IF EXISTS "Guards can create their own reports" ON public.patrol_reports;
DROP POLICY IF EXISTS "Guards can update their own reports" ON public.patrol_reports;

-- patrol_report_checkpoints policies referencing guards
DROP POLICY IF EXISTS "Guards can create checkpoint visits for their reports" ON public.patrol_report_checkpoints;

-- attendance policies referencing guards
DROP POLICY IF EXISTS "Role-based attendance visibility" ON public.attendance;

-- alarms policies referencing guards
DROP POLICY IF EXISTS "Guards can create alarms" ON public.alarms;

-- site_attendance policies referencing guards
DROP POLICY IF EXISTS "Guards can view own site attendance" ON public.site_attendance;
DROP POLICY IF EXISTS "Guards can check in" ON public.site_attendance;
DROP POLICY IF EXISTS "Guards can check out" ON public.site_attendance;

-- Also drop the guards-table-specific RLS policies
DROP POLICY IF EXISTS "Admins and managers can manage guards" ON public.guards;
DROP POLICY IF EXISTS "Role-based guard visibility" ON public.guards;

-- Step 2: Drop all foreign keys referencing guards
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_guard_id_fkey;
ALTER TABLE public.site_attendance DROP CONSTRAINT IF EXISTS site_attendance_guard_id_fkey;
ALTER TABLE public.patrol_reports DROP CONSTRAINT IF EXISTS patrol_reports_guard_id_fkey;
ALTER TABLE public.patrol_plans DROP CONSTRAINT IF EXISTS patrol_plans_guard_id_fkey;
ALTER TABLE public.project_assignments DROP CONSTRAINT IF EXISTS project_assignments_guard_id_fkey;
ALTER TABLE public.alarms DROP CONSTRAINT IF EXISTS alarms_guard_id_fkey;

-- Step 3: Drop guards table
DROP TABLE IF EXISTS public.guards;

-- Step 4: Add company_id and guard_status to profiles (if not already added)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS guard_status text DEFAULT 'active';

-- Step 5: Add new foreign keys referencing profiles
ALTER TABLE public.attendance 
  ADD CONSTRAINT attendance_guard_id_fkey FOREIGN KEY (guard_id) REFERENCES public.profiles(id);

ALTER TABLE public.site_attendance 
  ADD CONSTRAINT site_attendance_guard_id_fkey FOREIGN KEY (guard_id) REFERENCES public.profiles(id);

ALTER TABLE public.patrol_reports 
  ADD CONSTRAINT patrol_reports_guard_id_fkey FOREIGN KEY (guard_id) REFERENCES public.profiles(id);

ALTER TABLE public.patrol_plans 
  ADD CONSTRAINT patrol_plans_guard_id_fkey FOREIGN KEY (guard_id) REFERENCES public.profiles(id);

ALTER TABLE public.project_assignments 
  ADD CONSTRAINT project_assignments_guard_id_fkey FOREIGN KEY (guard_id) REFERENCES public.profiles(id);

ALTER TABLE public.alarms 
  ADD CONSTRAINT alarms_guard_id_fkey FOREIGN KEY (guard_id) REFERENCES public.profiles(id);

-- Step 6: Recreate RLS policies using profiles.id (= auth.uid()) directly

-- attendance
CREATE POLICY "Role-based attendance visibility" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR guard_id = auth.uid()
  );

-- site_attendance
CREATE POLICY "Guards can check in" ON public.site_attendance
  FOR INSERT TO authenticated
  WITH CHECK (guard_id = auth.uid());

CREATE POLICY "Guards can check out" ON public.site_attendance
  FOR UPDATE TO authenticated
  USING (guard_id = auth.uid());

CREATE POLICY "Guards can view own site attendance" ON public.site_attendance
  FOR SELECT TO authenticated
  USING (
    guard_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- patrol_reports
CREATE POLICY "Guards can create their own reports" ON public.patrol_reports
  FOR INSERT TO authenticated
  WITH CHECK (guard_id = auth.uid());

CREATE POLICY "Guards can update their own reports" ON public.patrol_reports
  FOR UPDATE TO authenticated
  USING (guard_id = auth.uid());

-- patrol_report_checkpoints
CREATE POLICY "Guards can create checkpoint visits for their reports" ON public.patrol_report_checkpoints
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patrol_reports pr
      WHERE pr.id = patrol_report_checkpoints.report_id 
        AND pr.guard_id = auth.uid()
    )
  );

-- alarms
CREATE POLICY "Guards can create alarms" ON public.alarms
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'guard'::app_role));

-- Step 7: Update profiles update policy to allow admin/manager
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users and admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  );
