import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Sun, Moon, UserCheck, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";

const projectSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().optional(),
  company_id: z.string().optional(),
  address: z.string().optional(),
  contact_person: z.string().optional(),
  contact_phone: z.string().optional(),
  morning_shift_count: z.coerce.number().min(0).default(0),
  evening_shift_count: z.coerce.number().min(0).default(0),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function Projects() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedShiftType, setSelectedShiftType] = useState<"morning" | "evening">("morning");
  const [selectedGuardId, setSelectedGuardId] = useState<string>("");
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", code: "", company_id: "", address: "", contact_person: "", contact_phone: "", morning_shift_count: 0, evening_shift_count: 0, status: "active", notes: "" },
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select(`*, companies (name)`).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: guardProfiles = [] } = useQuery({
    queryKey: ["guard-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, employee_id, phone").eq("guard_status", "active").order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["project_assignments", selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject?.id) return [];
      const { data, error } = await supabase.from("project_assignments").select(`*, profiles!guard_id(full_name, employee_id, phone)`).eq("project_id", selectedProject.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProject?.id,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", selectedProject?.id, attendanceDate],
    queryFn: async () => {
      if (!selectedProject?.id) return [];
      const { data, error } = await supabase.from("attendance").select(`*, profiles!guard_id(full_name, employee_id)`).eq("project_id", selectedProject.id).eq("date", attendanceDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProject?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const { error } = await supabase.from("projects").insert([{ name: data.name, code: data.code || null, company_id: data.company_id && data.company_id !== "none" ? data.company_id : null, address: data.address || null, contact_person: data.contact_person || null, contact_phone: data.contact_phone || null, morning_shift_count: data.morning_shift_count, evening_shift_count: data.evening_shift_count, status: data.status, notes: data.notes || null }]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); toast({ title: t('common.createSuccess') }); setIsDialogOpen(false); form.reset(); },
    onError: (error: any) => { toast({ title: t('common.createFailed'), description: error.message, variant: "destructive" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const { error } = await supabase.from("projects").update({ name: data.name, code: data.code || null, company_id: data.company_id && data.company_id !== "none" ? data.company_id : null, address: data.address || null, contact_person: data.contact_person || null, contact_phone: data.contact_phone || null, morning_shift_count: data.morning_shift_count, evening_shift_count: data.evening_shift_count, status: data.status, notes: data.notes || null }).eq("id", selectedProject.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); toast({ title: t('common.updateSuccess') }); setIsDialogOpen(false); setSelectedProject(null); form.reset(); },
    onError: (error: any) => { toast({ title: t('common.updateFailed'), description: error.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("projects").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); toast({ title: t('common.deleteSuccess') }); setIsDeleteDialogOpen(false); setSelectedProject(null); },
    onError: (error: any) => { toast({ title: t('common.deleteFailed'), description: error.message, variant: "destructive" }); },
  });

  const assignGuardMutation = useMutation({
    mutationFn: async ({ projectId, guardId, shiftType }: { projectId: string; guardId: string; shiftType: string }) => {
      const { error } = await supabase.from("project_assignments").insert([{ project_id: projectId, guard_id: guardId, shift_type: shiftType }]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project_assignments"] }); toast({ title: t('common.createSuccess') }); setSelectedGuardId(""); },
    onError: (error: any) => { toast({ title: t('common.createFailed'), description: error.message, variant: "destructive" }); },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("project_assignments").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project_assignments"] }); toast({ title: t('common.deleteSuccess') }); },
    onError: (error: any) => { toast({ title: t('common.deleteFailed'), description: error.message, variant: "destructive" }); },
  });

  const recordAttendanceMutation = useMutation({
    mutationFn: async ({ guardId, status, shiftType }: { guardId: string; status: string; shiftType: string }) => {
      const { error } = await supabase.from("attendance").upsert([{ project_id: selectedProject.id, guard_id: guardId, date: attendanceDate, shift_type: shiftType, status: status, check_in_time: status === "present" ? new Date().toISOString() : null }], { onConflict: "project_id,guard_id,date,shift_type" });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance"] }); toast({ title: t('common.updateSuccess') }); },
    onError: (error: any) => { toast({ title: t('common.updateFailed'), description: error.message, variant: "destructive" }); },
  });

  const handleAdd = () => { setSelectedProject(null); form.reset(); setIsDialogOpen(true); };
  const handleEdit = (project: any) => {
    setSelectedProject(project);
    form.reset({ name: project.name, code: project.code || "", company_id: project.company_id || "none", address: project.address || "", contact_person: project.contact_person || "", contact_phone: project.contact_phone || "", morning_shift_count: project.morning_shift_count || 0, evening_shift_count: project.evening_shift_count || 0, status: project.status || "active", notes: project.notes || "" });
    setIsDialogOpen(true);
  };
  const handleDelete = (project: any) => { setSelectedProject(project); setIsDeleteDialogOpen(true); };
  const handleManageGuards = (project: any) => { setSelectedProject(project); setIsAssignDialogOpen(true); };
  const handleAttendance = (project: any) => { setSelectedProject(project); setIsAttendanceDialogOpen(true); };
  const onSubmit = (data: ProjectFormData) => { if (selectedProject) { updateMutation.mutate(data); } else { createMutation.mutate(data); } };

  const morningGuards = assignments.filter((a: any) => a.shift_type === "morning");
  const eveningGuards = assignments.filter((a: any) => a.shift_type === "evening");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('projects.title')}</h1>
          <p className="text-muted-foreground">{t('projects.description')}</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t('projects.addProject')}
        </Button>
      </div>

      {isLoading ? (
        <div>{t('common.loading')}</div>
      ) : (
        <div className="grid gap-4">
          {projects.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">{t('projects.noProjects')}</CardContent></Card>
          ) : (
            projects.map((project: any) => (
              <Card key={project.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {project.name}
                        <Badge variant={project.status === "active" ? "default" : "secondary"}>
                          {project.status === "active" ? t('projects.ongoing') : t('projects.stopped')}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.companies?.name || t('projects.noCompanyLinked')} {project.code && `· ${project.code}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleManageGuards(project)}><Users className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleAttendance(project)}><Calendar className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(project)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(project)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{t('projects.morningShift')}: {project.morning_shift_count} {t('projects.people')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{t('projects.eveningShift')}: {project.evening_shift_count} {t('projects.people')}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{t('common.contactPerson')}: {project.contact_person || "-"}</div>
                    <div className="text-sm text-muted-foreground">{t('common.contactPhone')}: {project.contact_phone || "-"}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Project Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProject ? t('projects.editProject') : t('projects.addProject')}</DialogTitle>
            <DialogDescription>{selectedProject ? t('projects.editProjectDesc') : t('projects.addProjectDesc')}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t('projects.projectName')}</FormLabel><FormControl><Input {...field} placeholder={t('projects.enterProjectName')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem><FormLabel>{t('projects.projectCode')}</FormLabel><FormControl><Input {...field} placeholder={t('projects.enterCode')} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="company_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.belongsToCompany')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('projects.selectCompany')} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t('common.none')}</SelectItem>
                      {companies.map((company: any) => (<SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>{t('common.address')}</FormLabel><FormControl><Input {...field} placeholder={t('common.address')} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="contact_person" render={({ field }) => (
                  <FormItem><FormLabel>{t('common.contactPerson')}</FormLabel><FormControl><Input {...field} placeholder={t('common.contactPerson')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contact_phone" render={({ field }) => (
                  <FormItem><FormLabel>{t('common.contactPhone')}</FormLabel><FormControl><Input {...field} placeholder={t('common.contactPhone')} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="morning_shift_count" render={({ field }) => (
                  <FormItem><FormLabel>{t('projects.morningShiftCount')}</FormLabel><FormControl><Input {...field} type="number" min="0" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="evening_shift_count" render={({ field }) => (
                  <FormItem><FormLabel>{t('projects.eveningShiftCount')}</FormLabel><FormControl><Input {...field} type="number" min="0" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.status')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">{t('projects.ongoing')}</SelectItem>
                      <SelectItem value="inactive">{t('projects.stopped')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button type="submit">{selectedProject ? t('common.update') : t('common.create')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Guard Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('projects.guardShiftMgmt')} - {selectedProject?.name}</DialogTitle>
            <DialogDescription>{t('projects.assignGuardToShift')}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="morning" onValueChange={(v) => setSelectedShiftType(v as "morning" | "evening")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="morning" className="flex items-center gap-2"><Sun className="h-4 w-4" /> {t('projects.morningShift')} ({morningGuards.length})</TabsTrigger>
              <TabsTrigger value="evening" className="flex items-center gap-2"><Moon className="h-4 w-4" /> {t('projects.eveningShift')} ({eveningGuards.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="morning" className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedGuardId} onValueChange={setSelectedGuardId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={t('projects.selectGuard')} /></SelectTrigger>
                  <SelectContent>
                    {guardProfiles.filter((g: any) => !morningGuards.find((a: any) => a.guard_id === g.id)).map((guard: any) => (
                      <SelectItem key={guard.id} value={guard.id}>{guard.full_name} ({guard.employee_id || "-"})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => selectedGuardId && assignGuardMutation.mutate({ projectId: selectedProject.id, guardId: selectedGuardId, shiftType: "morning" })}>{t('common.add')}</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>{t('common.employeeId')}</TableHead><TableHead>{t('common.phone')}</TableHead><TableHead className="text-right">{t('common.actions')}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {morningGuards.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t('projects.noMorningGuards')}</TableCell></TableRow>
                  ) : morningGuards.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.profiles?.full_name}</TableCell><TableCell>{a.profiles?.employee_id || "-"}</TableCell><TableCell>{a.profiles?.phone || "-"}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => removeAssignmentMutation.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="evening" className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedGuardId} onValueChange={setSelectedGuardId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={t('projects.selectGuard')} /></SelectTrigger>
                  <SelectContent>
                    {guardProfiles.filter((g: any) => !eveningGuards.find((a: any) => a.guard_id === g.id)).map((guard: any) => (
                      <SelectItem key={guard.id} value={guard.id}>{guard.full_name} ({guard.employee_id || "-"})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => selectedGuardId && assignGuardMutation.mutate({ projectId: selectedProject.id, guardId: selectedGuardId, shiftType: "evening" })}>{t('common.add')}</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>{t('common.employeeId')}</TableHead><TableHead>{t('common.phone')}</TableHead><TableHead className="text-right">{t('common.actions')}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {eveningGuards.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t('projects.noEveningGuards')}</TableCell></TableRow>
                  ) : eveningGuards.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.profiles?.full_name}</TableCell><TableCell>{a.profiles?.employee_id || "-"}</TableCell><TableCell>{a.profiles?.phone || "-"}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => removeAssignmentMutation.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('projects.attendanceMgmt')} - {selectedProject?.name}</DialogTitle>
            <DialogDescription>{t('projects.recordAttendance')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">{t('common.date')}:</span>
              <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="w-auto" />
            </div>
            <Tabs defaultValue="morning">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="morning"><Sun className="h-4 w-4 mr-2" /> {t('projects.morningShift')}</TabsTrigger>
                <TabsTrigger value="evening"><Moon className="h-4 w-4 mr-2" /> {t('projects.eveningShift')}</TabsTrigger>
              </TabsList>
              <TabsContent value="morning">
                <Table>
                  <TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>{t('common.employeeId')}</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="text-right">{t('common.actions')}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {morningGuards.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t('projects.noMorningGuards')}</TableCell></TableRow>
                    ) : morningGuards.map((a: any) => {
                      const record = attendance.find((att: any) => att.guard_id === a.guard_id && att.shift_type === "morning");
                      return (
                        <TableRow key={a.id}>
                          <TableCell>{a.guards?.name}</TableCell>
                          <TableCell>{a.guards?.employee_id || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={record?.status === "present" ? "default" : record?.status === "absent" ? "destructive" : "secondary"}>
                              {record?.status === "present" ? t('projects.present') : record?.status === "absent" ? t('projects.absent') : record?.status === "late" ? t('projects.late') : record?.status === "leave" ? t('projects.leave') : t('projects.notRecorded')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" onClick={() => recordAttendanceMutation.mutate({ guardId: a.guard_id, status: "present", shiftType: "morning" })}>
                                <UserCheck className="h-3 w-3 mr-1" /> {t('projects.present')}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => recordAttendanceMutation.mutate({ guardId: a.guard_id, status: "absent", shiftType: "morning" })}>
                                {t('projects.absent')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="evening">
                <Table>
                  <TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>{t('common.employeeId')}</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="text-right">{t('common.actions')}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {eveningGuards.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t('projects.noEveningGuards')}</TableCell></TableRow>
                    ) : eveningGuards.map((a: any) => {
                      const record = attendance.find((att: any) => att.guard_id === a.guard_id && att.shift_type === "evening");
                      return (
                        <TableRow key={a.id}>
                          <TableCell>{a.guards?.name}</TableCell>
                          <TableCell>{a.guards?.employee_id || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={record?.status === "present" ? "default" : record?.status === "absent" ? "destructive" : "secondary"}>
                              {record?.status === "present" ? t('projects.present') : record?.status === "absent" ? t('projects.absent') : record?.status === "late" ? t('projects.late') : record?.status === "leave" ? t('projects.leave') : t('projects.notRecorded')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" onClick={() => recordAttendanceMutation.mutate({ guardId: a.guard_id, status: "present", shiftType: "evening" })}>
                                <UserCheck className="h-3 w-3 mr-1" /> {t('projects.present')}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => recordAttendanceMutation.mutate({ guardId: a.guard_id, status: "absent", shiftType: "evening" })}>
                                {t('projects.absent')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('projects.deleteProjectConfirm', { name: selectedProject?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedProject && deleteMutation.mutate(selectedProject.id)}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
