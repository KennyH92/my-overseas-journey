-- Create projects table for customer/project management
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  company_id UUID REFERENCES public.companies(id),
  address TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  morning_shift_count INTEGER DEFAULT 0,
  evening_shift_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create project_assignments table for guard assignments with shifts
CREATE TABLE public.project_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'evening')),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, guard_id, shift_type)
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'evening')),
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'leave')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, guard_id, date, shift_type)
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Authenticated users can view projects" ON public.projects
FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage projects" ON public.projects
FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS policies for project_assignments
CREATE POLICY "Authenticated users can view project assignments" ON public.project_assignments
FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage project assignments" ON public.project_assignments
FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS policies for attendance
CREATE POLICY "Authenticated users can view attendance" ON public.attendance
FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage attendance" ON public.attendance
FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_assignments_updated_at
BEFORE UPDATE ON public.project_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();