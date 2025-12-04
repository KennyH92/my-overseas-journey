import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Eye, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

const reportSchema = z.object({
  plan_id: z.string().optional(),
  guard_id: z.string().optional(),
  site_id: z.string().optional(),
  start_time: z.string().min(1, '请选择开始时间'),
  end_time: z.string().optional(),
  status: z.string().default('in_progress'),
  notes: z.string().optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

export default function PatrolReports() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [viewingReport, setViewingReport] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      plan_id: '',
      guard_id: '',
      site_id: '',
      start_time: '',
      end_time: '',
      status: 'in_progress',
      notes: '',
    },
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['patrol-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patrol_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['patrol-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patrol_plans')
        .select('id, name')
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: guards = [] } = useQuery({
    queryKey: ['guards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guards')
        .select('id, name')
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: reportCheckpoints = [] } = useQuery({
    queryKey: ['report-checkpoints', viewingReport?.id],
    queryFn: async () => {
      if (!viewingReport?.id) return [];
      const { data, error } = await supabase
        .from('patrol_report_checkpoints')
        .select('*, checkpoints:checkpoint_id(name)')
        .eq('report_id', viewingReport.id)
        .order('visited_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!viewingReport?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ReportFormData & { id: string }) => {
      const { error } = await supabase
        .from('patrol_reports')
        .update({
          plan_id: data.plan_id || null,
          guard_id: data.guard_id || null,
          site_id: data.site_id || null,
          start_time: data.start_time,
          end_time: data.end_time || null,
          status: data.status,
          notes: data.notes || null,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-reports'] });
      toast({ title: '更新成功', description: '巡更报告已更新' });
      setIsDialogOpen(false);
      setEditingReport(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: '更新失败', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('patrol_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-reports'] });
      toast({ title: '删除成功', description: '巡更报告已删除' });
    },
    onError: (error: any) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: ReportFormData) => {
    if (editingReport) {
      updateMutation.mutate({ ...data, id: editingReport.id });
    }
  };

  const handleEdit = (report: any) => {
    setEditingReport(report);
    form.reset({
      plan_id: report.plan_id || '',
      guard_id: report.guard_id || '',
      site_id: report.site_id || '',
      start_time: report.start_time ? format(new Date(report.start_time), "yyyy-MM-dd'T'HH:mm") : '',
      end_time: report.end_time ? format(new Date(report.end_time), "yyyy-MM-dd'T'HH:mm") : '',
      status: report.status || 'in_progress',
      notes: report.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个巡更报告吗？')) {
      deleteMutation.mutate(id);
    }
  };

  const getPlanName = (planId: string | null) => {
    if (!planId) return '-';
    const plan = plans.find((p) => p.id === planId);
    return plan?.name || '-';
  };

  const getGuardName = (guardId: string | null) => {
    if (!guardId) return '-';
    const guard = guards.find((g) => g.id === guardId);
    return guard?.name || '-';
  };

  const getSiteName = (siteId: string | null) => {
    if (!siteId) return '-';
    const site = sites.find((s) => s.id === siteId);
    return site?.name || '-';
  };

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      in_progress: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
    };
    const labels: Record<string, string> = {
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已取消',
    };
    return <Badge variant={variants[status || 'in_progress'] || 'outline'}>{labels[status || 'in_progress'] || status}</Badge>;
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">巡更报告</h1>
          <p className="text-muted-foreground">查看和管理巡更执行记录</p>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>计划名称</TableHead>
              <TableHead>保安</TableHead>
              <TableHead>站点</TableHead>
              <TableHead>开始时间</TableHead>
              <TableHead>结束时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  暂无巡更报告
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{getPlanName(report.plan_id)}</TableCell>
                  <TableCell>{getGuardName(report.guard_id)}</TableCell>
                  <TableCell>{getSiteName(report.site_id)}</TableCell>
                  <TableCell>{formatDateTime(report.start_time)}</TableCell>
                  <TableCell>{formatDateTime(report.end_time)}</TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewingReport(report)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(report)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(report.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setEditingReport(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑巡更报告</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="plan_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>巡更计划</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择计划" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">不指定</SelectItem>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guard_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>保安</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择保安" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">不指定</SelectItem>
                          {guards.map((guard) => (
                            <SelectItem key={guard.id} value={guard.id}>
                              {guard.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="site_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>站点</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择站点" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">不指定</SelectItem>
                          {sites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>开始时间 *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>结束时间</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in_progress">进行中</SelectItem>
                        <SelectItem value="completed">已完成</SelectItem>
                        <SelectItem value="cancelled">已取消</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注</FormLabel>
                    <FormControl>
                      <Textarea placeholder="请输入备注信息" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  更新
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              巡更报告详情
            </DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">计划名称：</span>
                  <span className="font-medium">{getPlanName(viewingReport.plan_id)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">保安：</span>
                  <span className="font-medium">{getGuardName(viewingReport.guard_id)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">站点：</span>
                  <span className="font-medium">{getSiteName(viewingReport.site_id)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">状态：</span>
                  {getStatusBadge(viewingReport.status)}
                </div>
                <div>
                  <span className="text-muted-foreground">开始时间：</span>
                  <span className="font-medium">{formatDateTime(viewingReport.start_time)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">结束时间：</span>
                  <span className="font-medium">{formatDateTime(viewingReport.end_time)}</span>
                </div>
              </div>

              {viewingReport.notes && (
                <div>
                  <span className="text-muted-foreground text-sm">备注：</span>
                  <p className="mt-1">{viewingReport.notes}</p>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-2">巡更点位记录</h3>
                {reportCheckpoints.length === 0 ? (
                  <p className="text-muted-foreground text-sm">暂无点位记录</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>点位名称</TableHead>
                          <TableHead>打卡时间</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>备注</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportCheckpoints.map((cp: any) => (
                          <TableRow key={cp.id}>
                            <TableCell>{cp.checkpoints?.name || '-'}</TableCell>
                            <TableCell>{formatDateTime(cp.visited_at)}</TableCell>
                            <TableCell>
                              <Badge variant={cp.status === 'completed' ? 'secondary' : 'outline'}>
                                {cp.status === 'completed' ? '已完成' : cp.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{cp.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
