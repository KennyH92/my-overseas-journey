import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Sun, Moon, UserCheck, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";

const projectSchema = z.object({
  name: z.string().min(1, "项目名称必填").max(100),
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
    defaultValues: {
      name: "",
      code: "",
      company_id: "",
      address: "",
      contact_person: "",
      contact_phone: "",
      morning_shift_count: 0,
      evening_shift_count: 0,
      status: "active",
      notes: "",
    },
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`*, companies (name)`)
        .order("created_at", { ascending: false });
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

  const { data: guards = [] } = useQuery({
    queryKey: ["guards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("guards").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["project_assignments", selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject?.id) return [];
      const { data, error } = await supabase
        .from("project_assignments")
        .select(`*, guards (name, employee_id, phone)`)
        .eq("project_id", selectedProject.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProject?.id,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", selectedProject?.id, attendanceDate],
    queryFn: async () => {
      if (!selectedProject?.id) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select(`*, guards (name, employee_id)`)
        .eq("project_id", selectedProject.id)
        .eq("date", attendanceDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProject?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const { error } = await supabase.from("projects").insert([{
        name: data.name,
        code: data.code || null,
        company_id: data.company_id && data.company_id !== "none" ? data.company_id : null,
        address: data.address || null,
        contact_person: data.contact_person || null,
        contact_phone: data.contact_phone || null,
        morning_shift_count: data.morning_shift_count,
        evening_shift_count: data.evening_shift_count,
        status: data.status,
        notes: data.notes || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "项目创建成功" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "创建失败", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const { error } = await supabase
        .from("projects")
        .update({
          name: data.name,
          code: data.code || null,
          company_id: data.company_id && data.company_id !== "none" ? data.company_id : null,
          address: data.address || null,
          contact_person: data.contact_person || null,
          contact_phone: data.contact_phone || null,
          morning_shift_count: data.morning_shift_count,
          evening_shift_count: data.evening_shift_count,
          status: data.status,
          notes: data.notes || null,
        })
        .eq("id", selectedProject.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "项目更新成功" });
      setIsDialogOpen(false);
      setSelectedProject(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "更新失败", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "项目删除成功" });
      setIsDeleteDialogOpen(false);
      setSelectedProject(null);
    },
    onError: (error: any) => {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    },
  });

  const assignGuardMutation = useMutation({
    mutationFn: async ({ projectId, guardId, shiftType }: { projectId: string; guardId: string; shiftType: string }) => {
      const { error } = await supabase.from("project_assignments").insert([{
        project_id: projectId,
        guard_id: guardId,
        shift_type: shiftType,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_assignments"] });
      toast({ title: "保安分配成功" });
      setSelectedGuardId("");
    },
    onError: (error: any) => {
      toast({ title: "分配失败", description: error.message, variant: "destructive" });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_assignments"] });
      toast({ title: "已移除分配" });
    },
    onError: (error: any) => {
      toast({ title: "移除失败", description: error.message, variant: "destructive" });
    },
  });

  const recordAttendanceMutation = useMutation({
    mutationFn: async ({ guardId, status, shiftType }: { guardId: string; status: string; shiftType: string }) => {
      const { error } = await supabase.from("attendance").upsert([{
        project_id: selectedProject.id,
        guard_id: guardId,
        date: attendanceDate,
        shift_type: shiftType,
        status: status,
        check_in_time: status === "present" ? new Date().toISOString() : null,
      }], { onConflict: "project_id,guard_id,date,shift_type" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast({ title: "考勤记录成功" });
    },
    onError: (error: any) => {
      toast({ title: "记录失败", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    setSelectedProject(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleEdit = (project: any) => {
    setSelectedProject(project);
    form.reset({
      name: project.name,
      code: project.code || "",
      company_id: project.company_id || "none",
      address: project.address || "",
      contact_person: project.contact_person || "",
      contact_phone: project.contact_phone || "",
      morning_shift_count: project.morning_shift_count || 0,
      evening_shift_count: project.evening_shift_count || 0,
      status: project.status || "active",
      notes: project.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (project: any) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };

  const handleManageGuards = (project: any) => {
    setSelectedProject(project);
    setIsAssignDialogOpen(true);
  };

  const handleAttendance = (project: any) => {
    setSelectedProject(project);
    setIsAttendanceDialogOpen(true);
  };

  const onSubmit = (data: ProjectFormData) => {
    if (selectedProject) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const morningGuards = assignments.filter((a: any) => a.shift_type === "morning");
  const eveningGuards = assignments.filter((a: any) => a.shift_type === "evening");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">顾客/项目管理</h1>
          <p className="text-muted-foreground">管理项目信息、保安班次及考勤</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          新增项目
        </Button>
      </div>

      {isLoading ? (
        <div>加载中...</div>
      ) : (
        <div className="grid gap-4">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                暂无项目，点击上方按钮添加第一个项目
              </CardContent>
            </Card>
          ) : (
            projects.map((project: any) => (
              <Card key={project.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {project.name}
                        <Badge variant={project.status === "active" ? "default" : "secondary"}>
                          {project.status === "active" ? "进行中" : "已停止"}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.companies?.name || "未关联公司"} {project.code && `· ${project.code}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleManageGuards(project)}>
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleAttendance(project)}>
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(project)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(project)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">早班: {project.morning_shift_count} 人</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">晚班: {project.evening_shift_count} 人</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      联系人: {project.contact_person || "-"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      电话: {project.contact_phone || "-"}
                    </div>
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
            <DialogTitle>{selectedProject ? "编辑项目" : "新增项目"}</DialogTitle>
            <DialogDescription>
              {selectedProject ? "更新项目信息" : "添加新的顾客/项目"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>项目名称</FormLabel>
                    <FormControl><Input {...field} placeholder="输入项目名称" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>项目编号</FormLabel>
                    <FormControl><Input {...field} placeholder="输入编号" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="company_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>所属公司</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="选择公司" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      {companies.map((company: any) => (
                        <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>地址</FormLabel>
                  <FormControl><Input {...field} placeholder="输入地址" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="contact_person" render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系人</FormLabel>
                    <FormControl><Input {...field} placeholder="联系人姓名" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="contact_phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系电话</FormLabel>
                    <FormControl><Input {...field} placeholder="联系电话" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="morning_shift_count" render={({ field }) => (
                  <FormItem>
                    <FormLabel>早班人数</FormLabel>
                    <FormControl><Input {...field} type="number" min="0" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="evening_shift_count" render={({ field }) => (
                  <FormItem>
                    <FormLabel>晚班人数</FormLabel>
                    <FormControl><Input {...field} type="number" min="0" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>状态</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">进行中</SelectItem>
                      <SelectItem value="inactive">已停止</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
                <Button type="submit">{selectedProject ? "更新" : "创建"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Guard Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>保安班次管理 - {selectedProject?.name}</DialogTitle>
            <DialogDescription>分配保安到早班或晚班</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="morning" onValueChange={(v) => setSelectedShiftType(v as "morning" | "evening")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="morning" className="flex items-center gap-2">
                <Sun className="h-4 w-4" /> 早班 ({morningGuards.length})
              </TabsTrigger>
              <TabsTrigger value="evening" className="flex items-center gap-2">
                <Moon className="h-4 w-4" /> 晚班 ({eveningGuards.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="morning" className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedGuardId} onValueChange={setSelectedGuardId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="选择保安" /></SelectTrigger>
                  <SelectContent>
                    {guards.filter((g: any) => !morningGuards.find((a: any) => a.guard_id === g.id)).map((guard: any) => (
                      <SelectItem key={guard.id} value={guard.id}>{guard.name} ({guard.employee_id || "无工号"})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => selectedGuardId && assignGuardMutation.mutate({ projectId: selectedProject.id, guardId: selectedGuardId, shiftType: "morning" })}>
                  添加
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>工号</TableHead>
                    <TableHead>电话</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {morningGuards.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">暂无早班保安</TableCell></TableRow>
                  ) : morningGuards.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.guards?.name}</TableCell>
                      <TableCell>{a.guards?.employee_id || "-"}</TableCell>
                      <TableCell>{a.guards?.phone || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeAssignmentMutation.mutate(a.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="evening" className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedGuardId} onValueChange={setSelectedGuardId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="选择保安" /></SelectTrigger>
                  <SelectContent>
                    {guards.filter((g: any) => !eveningGuards.find((a: any) => a.guard_id === g.id)).map((guard: any) => (
                      <SelectItem key={guard.id} value={guard.id}>{guard.name} ({guard.employee_id || "无工号"})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => selectedGuardId && assignGuardMutation.mutate({ projectId: selectedProject.id, guardId: selectedGuardId, shiftType: "evening" })}>
                  添加
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>工号</TableHead>
                    <TableHead>电话</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eveningGuards.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">暂无晚班保安</TableCell></TableRow>
                  ) : eveningGuards.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.guards?.name}</TableCell>
                      <TableCell>{a.guards?.employee_id || "-"}</TableCell>
                      <TableCell>{a.guards?.phone || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeAssignmentMutation.mutate(a.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
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
            <DialogTitle>考勤管理 - {selectedProject?.name}</DialogTitle>
            <DialogDescription>记录保安出勤情况</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">日期:</span>
              <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="w-auto" />
            </div>
            <Tabs defaultValue="morning">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="morning"><Sun className="h-4 w-4 mr-2" /> 早班</TabsTrigger>
                <TabsTrigger value="evening"><Moon className="h-4 w-4 mr-2" /> 晚班</TabsTrigger>
              </TabsList>
              <TabsContent value="morning">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>工号</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {morningGuards.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">暂无早班保安</TableCell></TableRow>
                    ) : morningGuards.map((a: any) => {
                      const record = attendance.find((att: any) => att.guard_id === a.guard_id && att.shift_type === "morning");
                      return (
                        <TableRow key={a.id}>
                          <TableCell>{a.guards?.name}</TableCell>
                          <TableCell>{a.guards?.employee_id || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={record?.status === "present" ? "default" : record?.status === "absent" ? "destructive" : "secondary"}>
                              {record?.status === "present" ? "出勤" : record?.status === "absent" ? "缺勤" : record?.status === "late" ? "迟到" : record?.status === "leave" ? "请假" : "未记录"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" onClick={() => recordAttendanceMutation.mutate({ guardId: a.guard_id, status: "present", shiftType: "morning" })}>
                                <UserCheck className="h-3 w-3 mr-1" /> 出勤
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => recordAttendanceMutation.mutate({ guardId: a.guard_id, status: "absent", shiftType: "morning" })}>
                                缺勤
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
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>工号</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eveningGuards.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">暂无晚班保安</TableCell></TableRow>
                    ) : eveningGuards.map((a: any) => {
                      const record = attendance.find((att: any) => att.guard_id === a.guard_id && att.shift_type === "evening");
                      return (
                        <TableRow key={a.id}>
                          <TableCell>{a.guards?.name}</TableCell>
                          <TableCell>{a.guards?.employee_id || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={record?.status === "present" ? "default" : record?.status === "absent" ? "destructive" : "secondary"}>
                              {record?.status === "present" ? "出勤" : record?.status === "absent" ? "缺勤" : record?.status === "late" ? "迟到" : record?.status === "leave" ? "请假" : "未记录"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" onClick={() => recordAttendanceMutation.mutate({ guardId: a.guard_id, status: "present", shiftType: "evening" })}>
                                <UserCheck className="h-3 w-3 mr-1" /> 出勤
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => recordAttendanceMutation.mutate({ guardId: a.guard_id, status: "absent", shiftType: "evening" })}>
                                缺勤
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
            <AlertDialogTitle>确认删除?</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除项目 "{selectedProject?.name}"，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedProject && deleteMutation.mutate(selectedProject.id)}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}