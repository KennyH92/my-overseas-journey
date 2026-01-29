-- Fix 1: Restrict profile visibility to own profile + admins/managers
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Role-based profile visibility"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Fix 2: Restrict alarm creation to verified guards only
DROP POLICY IF EXISTS "Guards can create alarms" ON public.alarms;

CREATE POLICY "Guards can create alarms"
ON public.alarms FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guards 
    WHERE guards.user_id = auth.uid() 
    AND guards.status = 'active'
  )
);

-- Fix 3: Restrict attendance visibility to own records + admins/managers/supervisors
DROP POLICY IF EXISTS "Authenticated users can view attendance" ON public.attendance;

CREATE POLICY "Role-based attendance visibility"
ON public.attendance FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR
  EXISTS (
    SELECT 1 FROM guards 
    WHERE guards.id = attendance.guard_id 
    AND guards.user_id = auth.uid()
  )
);