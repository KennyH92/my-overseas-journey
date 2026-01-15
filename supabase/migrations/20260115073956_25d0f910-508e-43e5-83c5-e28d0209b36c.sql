-- Allow admins and managers to delete profiles
CREATE POLICY "Admins and managers can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));