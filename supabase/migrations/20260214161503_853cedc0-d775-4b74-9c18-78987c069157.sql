
-- Step 1: Drop ALL policies that reference app_role (via has_role function)
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and managers can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and managers can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Admins and managers can manage guards" ON public.guards;
DROP POLICY IF EXISTS "Role-based guard visibility" ON public.guards;
DROP POLICY IF EXISTS "Admins and managers can manage sites" ON public.sites;
DROP POLICY IF EXISTS "Authenticated users can view sites" ON public.sites;
DROP POLICY IF EXISTS "Admins and managers can manage checkpoints" ON public.checkpoints;
DROP POLICY IF EXISTS "Authenticated users can view checkpoints" ON public.checkpoints;
DROP POLICY IF EXISTS "Admins and managers can manage all reports" ON public.patrol_reports;
DROP POLICY IF EXISTS "Authenticated users can view patrol reports" ON public.patrol_reports;
DROP POLICY IF EXISTS "Guards can create their own reports" ON public.patrol_reports;
DROP POLICY IF EXISTS "Guards can update their own reports" ON public.patrol_reports;
DROP POLICY IF EXISTS "Admins and managers can manage all checkpoint visits" ON public.patrol_report_checkpoints;
DROP POLICY IF EXISTS "Authenticated users can view checkpoint visits" ON public.patrol_report_checkpoints;
DROP POLICY IF EXISTS "Guards can create checkpoint visits for their reports" ON public.patrol_report_checkpoints;
DROP POLICY IF EXISTS "Admins and managers can manage notices" ON public.notices;
DROP POLICY IF EXISTS "Authenticated users can view notices" ON public.notices;
DROP POLICY IF EXISTS "Admins and managers can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and managers can manage project assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Authenticated users can view project assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Admins and managers can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Role-based attendance visibility" ON public.attendance;
DROP POLICY IF EXISTS "Admins and managers can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Role-based profile visibility" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins, managers, supervisors can manage patrol plans" ON public.patrol_plans;
DROP POLICY IF EXISTS "Admins and managers can manage patrol plans" ON public.patrol_plans;
DROP POLICY IF EXISTS "Authenticated users can view patrol plans" ON public.patrol_plans;
DROP POLICY IF EXISTS "Admins, managers, supervisors can manage patrol plan checkpoint" ON public.patrol_plan_checkpoints;
DROP POLICY IF EXISTS "Admins and managers can manage patrol plan checkpoints" ON public.patrol_plan_checkpoints;
DROP POLICY IF EXISTS "Authenticated users can view patrol plan checkpoints" ON public.patrol_plan_checkpoints;
DROP POLICY IF EXISTS "Admins, managers, supervisors can manage alarms" ON public.alarms;
DROP POLICY IF EXISTS "Admins and managers can manage alarms" ON public.alarms;
DROP POLICY IF EXISTS "Authenticated users can view alarms" ON public.alarms;
DROP POLICY IF EXISTS "Guards can create alarms" ON public.alarms;

-- Step 2: Drop has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Step 3: Rename old enum, create new one without supervisor
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'guard');

-- Step 4: Update user_roles column
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;

-- Step 5: Drop old enum
DROP TYPE public.app_role_old;

-- Step 6: Recreate has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 7: Recreate ALL RLS policies

-- user_roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins and managers can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- companies
CREATE POLICY "Admins and managers can manage companies" ON public.companies FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Authenticated users can view companies" ON public.companies FOR SELECT USING (true);

-- guards
CREATE POLICY "Admins and managers can manage guards" ON public.guards FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Role-based guard visibility" ON public.guards FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR (user_id = auth.uid()));

-- sites
CREATE POLICY "Admins and managers can manage sites" ON public.sites FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Authenticated users can view sites" ON public.sites FOR SELECT USING (true);

-- checkpoints
CREATE POLICY "Admins and managers can manage checkpoints" ON public.checkpoints FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Authenticated users can view checkpoints" ON public.checkpoints FOR SELECT USING (true);

-- patrol_reports
CREATE POLICY "Admins and managers can manage all reports" ON public.patrol_reports FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Authenticated users can view patrol reports" ON public.patrol_reports FOR SELECT USING (true);
CREATE POLICY "Guards can create their own reports" ON public.patrol_reports FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM guards WHERE guards.user_id = auth.uid() AND guards.id = patrol_reports.guard_id));
CREATE POLICY "Guards can update their own reports" ON public.patrol_reports FOR UPDATE USING (EXISTS (SELECT 1 FROM guards WHERE guards.user_id = auth.uid() AND guards.id = patrol_reports.guard_id));

-- patrol_report_checkpoints
CREATE POLICY "Admins and managers can manage all checkpoint visits" ON public.patrol_report_checkpoints FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Authenticated users can view checkpoint visits" ON public.patrol_report_checkpoints FOR SELECT USING (true);
CREATE POLICY "Guards can create checkpoint visits for their reports" ON public.patrol_report_checkpoints FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM patrol_reports pr JOIN guards g ON pr.guard_id = g.id WHERE pr.id = patrol_report_checkpoints.report_id AND g.user_id = auth.uid()));

-- notices
CREATE POLICY "Admins and managers can manage notices" ON public.notices FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Authenticated users can view notices" ON public.notices FOR SELECT USING (true);

-- projects
CREATE POLICY "Admins and managers can manage projects" ON public.projects FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Authenticated users can view projects" ON public.projects FOR SELECT USING (true);

-- project_assignments
CREATE POLICY "Admins and managers can manage project assignments" ON public.project_assignments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Authenticated users can view project assignments" ON public.project_assignments FOR SELECT USING (true);

-- attendance
CREATE POLICY "Admins and managers can manage attendance" ON public.attendance FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Role-based attendance visibility" ON public.attendance FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR (EXISTS (SELECT 1 FROM guards WHERE guards.id = attendance.guard_id AND guards.user_id = auth.uid())));

-- profiles
CREATE POLICY "Admins and managers can delete profiles" ON public.profiles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Role-based profile visibility" ON public.profiles FOR SELECT USING (id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- patrol_plans
CREATE POLICY "Admins and managers can manage patrol plans" ON public.patrol_plans FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Authenticated users can view patrol plans" ON public.patrol_plans FOR SELECT USING (true);

-- patrol_plan_checkpoints
CREATE POLICY "Admins and managers can manage patrol plan checkpoints" ON public.patrol_plan_checkpoints FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Authenticated users can view patrol plan checkpoints" ON public.patrol_plan_checkpoints FOR SELECT USING (true);

-- alarms
CREATE POLICY "Admins and managers can manage alarms" ON public.alarms FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Authenticated users can view alarms" ON public.alarms FOR SELECT USING (true);
CREATE POLICY "Guards can create alarms" ON public.alarms FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM guards WHERE guards.user_id = auth.uid() AND guards.status = 'active'::text));
