import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogDescription,
  DialogFooter,
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, QrCode, Nfc, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const checkpointSchema = z.object({
  name: z.string().min(1, '检查点名称不能为空'),
  code: z.string().optional(),
  qr_code: z.string().optional(),
  nfc_code: z.string().optional(),
  site_id: z.string().uuid('请选择站点'),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  order_index: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

type CheckpointFormData = z.infer<typeof checkpointSchema>;

export default function Checkpoints() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<any>(null);
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CheckpointFormData>({
    resolver: zodResolver(checkpointSchema),
    defaultValues: {
      name: '',
      code: '',
      qr_code: '',
      nfc_code: '',
      site_id: '',
      latitude: '',
      longitude: '',
      order_index: '0',
      status: 'active',
    },
  });

  const { data: checkpoints, isLoading } = useQuery({
    queryKey: ['checkpoints', siteFilter],
    queryFn: async () => {
      let query = supabase
        .from('checkpoints')
        .select('*, sites(name)')
        .order('site_id')
        .order('order_index');
      
      if (siteFilter !== 'all') {
        query = query.eq('site_id', siteFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CheckpointFormData) => {
      const { error } = await supabase.from('checkpoints').insert([{
        name: data.name,
        code: data.code || null,
        qr_code: data.qr_code || null,
        nfc_code: data.nfc_code || null,
        site_id: data.site_id,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        order_index: data.order_index ? parseInt(data.order_index) : 0,
        status: data.status,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
      toast({ title: '创建成功', description: '检查点已创建' });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: '创建失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CheckpointFormData & { id: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('checkpoints')
        .update({
          name: updateData.name,
          code: updateData.code || null,
          qr_code: updateData.qr_code || null,
          nfc_code: updateData.nfc_code || null,
          site_id: updateData.site_id,
          latitude: updateData.latitude ? parseFloat(updateData.latitude) : null,
          longitude: updateData.longitude ? parseFloat(updateData.longitude) : null,
          order_index: updateData.order_index ? parseInt(updateData.order_index) : 0,
          status: updateData.status,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
      toast({ title: '更新成功', description: '检查点已更新' });
      setIsDialogOpen(false);
      setEditingCheckpoint(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: '更新失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checkpoints').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
      toast({ title: '删除成功', description: '检查点已删除' });
    },
    onError: (error: any) => {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleOpenDialog = (checkpoint?: any) => {
    if (checkpoint) {
      setEditingCheckpoint(checkpoint);
      form.reset({
        name: checkpoint.name,
        code: checkpoint.code || '',
        qr_code: checkpoint.qr_code || '',
        nfc_code: checkpoint.nfc_code || '',
        site_id: checkpoint.site_id,
        latitude: checkpoint.latitude?.toString() || '',
        longitude: checkpoint.longitude?.toString() || '',
        order_index: checkpoint.order_index?.toString() || '0',
        status: checkpoint.status,
      });
    } else {
      setEditingCheckpoint(null);
      form.reset({
        name: '',
        code: '',
        qr_code: '',
        nfc_code: '',
        site_id: siteFilter !== 'all' ? siteFilter : '',
        latitude: '',
        longitude: '',
        order_index: '0',
        status: 'active',
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: CheckpointFormData) => {
    if (editingCheckpoint) {
      updateMutation.mutate({ ...data, id: editingCheckpoint.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">检查点管理</h1>
          <p className="text-muted-foreground mt-1">管理巡更检查点信息</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          添加检查点
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="w-64">
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger>
              <SelectValue placeholder="筛选站点" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部站点</SelectItem>
              {sites?.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>检查点名称</TableHead>
              <TableHead>编号</TableHead>
              <TableHead>所属站点</TableHead>
              <TableHead>位置</TableHead>
              <TableHead>顺序</TableHead>
              <TableHead>标识</TableHead>
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
            ) : checkpoints?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  暂无检查点数据
                </TableCell>
              </TableRow>
            ) : (
              checkpoints?.map((checkpoint) => (
                <TableRow key={checkpoint.id}>
                  <TableCell className="font-medium">{checkpoint.name}</TableCell>
                  <TableCell>{checkpoint.code || '-'}</TableCell>
                  <TableCell>{checkpoint.sites?.name || '-'}</TableCell>
                  <TableCell>
                    {checkpoint.latitude && checkpoint.longitude ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">
                          {Number(checkpoint.latitude).toFixed(4)}, {Number(checkpoint.longitude).toFixed(4)}
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{checkpoint.order_index}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {checkpoint.qr_code && (
                        <QrCode className="w-4 h-4 text-blue-500" />
                      )}
                      {checkpoint.nfc_code && (
                        <Nfc className="w-4 h-4 text-green-500" />
                      )}
                      {!checkpoint.qr_code && !checkpoint.nfc_code && '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        checkpoint.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {checkpoint.status === 'active' ? '启用' : '停用'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(checkpoint)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(checkpoint.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCheckpoint ? '编辑检查点' : '添加检查点'}</DialogTitle>
            <DialogDescription>
              {editingCheckpoint ? '修改检查点信息' : '填写新检查点信息'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>检查点名称 *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="输入检查点名称" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>检查点编号</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="输入检查点编号" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="site_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>所属站点 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择站点" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites?.map((site) => (
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="qr_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>二维码</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="输入二维码数据" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nfc_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NFC标签</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="输入NFC标签数据" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>纬度</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="例: 39.9042" type="number" step="any" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>经度</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="例: 116.4074" type="number" step="any" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="order_index"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>顺序</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0" type="number" />
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
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">启用</SelectItem>
                        <SelectItem value="inactive">停用</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit">
                  {editingCheckpoint ? '更新' : '创建'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
