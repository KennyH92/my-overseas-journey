-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view guards" ON public.guards;

-- Create role-based visibility policy
-- Admins, managers, and supervisors can view all guards
-- Guards can only view their own record
CREATE POLICY "Role-based guard visibility" ON public.guards
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role) OR
  user_id = auth.uid()
);