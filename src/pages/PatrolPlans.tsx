import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
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
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const planSchema = z.object({
  name: z.string().min(1, '请输入计划名称'),
  site_id: z.string().min(1, '请选择站点'),
  guard_id: z.string().optional(),
  start_date: z.string().min(1, '请选择开始日期'),
  end_date: z.string().min(1, '请选择结束日期'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  frequency: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default('active'),
});

type PlanFormData = z.infer<typeof planSchema>;

export default function PatrolPlans() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      site_id: '',
      guard_id: '',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      frequency: '',
      notes: '',
      status: 'active',
    },
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['patrol-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patrol_plans')
        .select('*')
        .order('created_at', { ascending: false });
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

  const createMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const { error } = await supabase.from('patrol_plans').insert({
        name: data.name,
        site_id: data.site_id,
        guard_id: data.guard_id || null,
        start_date: data.start_date,
        end_date: data.end_date,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        frequency: data.frequency || null,
        notes: data.notes || null,
        status: data.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-plans'] });
      toast({ title: '创建成功', description: '巡更计划已创建' });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: '创建失败', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PlanFormData & { id: string }) => {
      const { error } = await supabase
        .from('patrol_plans')
        .update({
          name: data.name,
          site_id: data.site_id,
          guard_id: data.guard_id || null,
          start_date: data.start_date,
          end_date: data.end_date,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          frequency: data.frequency || null,
          notes: data.notes || null,
          status: data.status,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-plans'] });
      toast({ title: '更新成功', description: '巡更计划已更新' });
      setIsDialogOpen(false);
      setEditingPlan(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: '更新失败', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('patrol_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-plans'] });
      toast({ title: '删除成功', description: '巡更计划已删除' });
    },
    onError: (error: any) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: PlanFormData) => {
    if (editingPlan) {
      updateMutation.mutate({ ...data, id: editingPlan.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      site_id: plan.site_id,
      guard_id: plan.guard_id || '',
      start_date: plan.start_date,
      end_date: plan.end_date,
      start_time: plan.start_time || '',
      end_time: plan.end_time || '',
      frequency: plan.frequency || '',
      notes: plan.notes || '',
      status: plan.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个巡更计划吗？')) {
      deleteMutation.mutate(id);
    }
  };

  const getSiteName = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId);
    return site?.name || '-';
  };

  const getGuardName = (guardId: string | null) => {
    if (!guardId) return '-';
    const guard = guards.find((g) => g.id === guardId);
    return guard?.name || '-';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      inactive: 'secondary',
      completed: 'destructive',
    };
    const labels: Record<string, string> = {
      active: '进行中',
      inactive: '未激活',
      completed: '已完成',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const getFrequencyLabel = (frequency: string | null) => {
    if (!frequency) return '-';
    const labels: Record<string, string> = {
      daily: '每天',
      weekly: '每周',
      monthly: '每月',
      once: '一次性',
    };
    return labels[frequency] || frequency;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">巡更计划</h1>
          <p className="text-muted-foreground">管理巡更计划和路线安排</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingPlan(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新建计划
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? '编辑巡更计划' : '新建巡更计划'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>计划名称 *</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入计划名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="site_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>站点 *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择站点" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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

                  <FormField
                    control={form.control}
                    name="guard_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>负责保安</FormLabel>
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>开始日期 *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>结束日期 *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
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
                        <FormLabel>开始时间</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
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
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>频率</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择频率" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="once">一次性</SelectItem>
                            <SelectItem value="daily">每天</SelectItem>
                            <SelectItem value="weekly">每周</SelectItem>
                            <SelectItem value="monthly">每月</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            <SelectItem value="active">进行中</SelectItem>
                            <SelectItem value="inactive">未激活</SelectItem>
                            <SelectItem value="completed">已完成</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingPlan ? '更新' : '创建'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>计划名称</TableHead>
              <TableHead>站点</TableHead>
              <TableHead>负责保安</TableHead>
              <TableHead>日期范围</TableHead>
              <TableHead>时间范围</TableHead>
              <TableHead>频率</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  暂无巡更计划
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{getSiteName(plan.site_id)}</TableCell>
                  <TableCell>{getGuardName(plan.guard_id)}</TableCell>
                  <TableCell>
                    {plan.start_date} ~ {plan.end_date}
                  </TableCell>
                  <TableCell>
                    {plan.start_time && plan.end_time
                      ? `${plan.start_time} - ${plan.end_time}`
                      : '-'}
                  </TableCell>
                  <TableCell>{getFrequencyLabel(plan.frequency)}</TableCell>
                  <TableCell>{getStatusBadge(plan.status || 'active')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(plan.id)}
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
    </div>
  );
}
