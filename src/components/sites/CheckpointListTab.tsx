import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, QrCode, MapPin, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { QRCodeSVG } from 'qrcode.react';

const checkpointSchema = z.object({
  name: z.string().min(1, '检查点名称不能为空'),
  code: z.string().optional(),
  nfc_code: z.string().optional(),
  site_id: z.string().uuid('请选择站点'),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  order_index: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

type CheckpointFormData = z.infer<typeof checkpointSchema>;

export default function CheckpointListTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<any>(null);
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CheckpointFormData>({
    resolver: zodResolver(checkpointSchema),
    defaultValues: {
      name: '', code: '', nfc_code: '', site_id: '',
      latitude: '', longitude: '', order_index: '0', status: 'active',
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
    queryKey: ['sites-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites').select('id, name').eq('status', 'active').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Generate a unique QR code value for a checkpoint
  const generateQrValue = (checkpointId: string, siteName: string, checkpointName: string) => {
    return JSON.stringify({
      type: 'patrol_checkpoint',
      id: checkpointId,
      site: siteName,
      name: checkpointName,
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CheckpointFormData) => {
      // First create the checkpoint
      const { data: created, error } = await supabase.from('checkpoints').insert([{
        name: data.name,
        code: data.code || null,
        nfc_code: data.nfc_code || null,
        site_id: data.site_id,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        order_index: data.order_index ? parseInt(data.order_index) : 0,
        status: data.status,
      }]).select('id').single();
      if (error) throw error;

      // Auto-generate QR code with checkpoint ID
      const siteName = sites?.find(s => s.id === data.site_id)?.name || '';
      const qrValue = generateQrValue(created.id, siteName, data.name);
      const { error: updateError } = await supabase
        .from('checkpoints')
        .update({ qr_code: qrValue })
        .eq('id', created.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
      toast({ title: '创建成功', description: '检查点已创建，二维码已自动生成' });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: '创建失败', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CheckpointFormData & { id: string }) => {
      const { id, ...updateData } = data;
      const siteName = sites?.find(s => s.id === updateData.site_id)?.name || '';
      const qrValue = generateQrValue(id, siteName, updateData.name);
      const { error } = await supabase.from('checkpoints').update({
        name: updateData.name,
        code: updateData.code || null,
        qr_code: qrValue,
        nfc_code: updateData.nfc_code || null,
        site_id: updateData.site_id,
        latitude: updateData.latitude ? parseFloat(updateData.latitude) : null,
        longitude: updateData.longitude ? parseFloat(updateData.longitude) : null,
        order_index: updateData.order_index ? parseInt(updateData.order_index) : 0,
        status: updateData.status,
      }).eq('id', id);
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
      toast({ title: '更新失败', description: error.message, variant: 'destructive' });
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
      toast({ title: '删除失败', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (checkpoint?: any) => {
    if (checkpoint) {
      setEditingCheckpoint(checkpoint);
      form.reset({
        name: checkpoint.name, code: checkpoint.code || '',
        nfc_code: checkpoint.nfc_code || '', site_id: checkpoint.site_id,
        latitude: checkpoint.latitude?.toString() || '',
        longitude: checkpoint.longitude?.toString() || '',
        order_index: checkpoint.order_index?.toString() || '0',
        status: checkpoint.status,
      });
    } else {
      setEditingCheckpoint(null);
      form.reset({
        name: '', code: '', nfc_code: '',
        site_id: siteFilter !== 'all' ? siteFilter : '',
        latitude: '', longitude: '', order_index: '0', status: 'active',
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

  const handleShowQr = (checkpoint: any) => {
    setSelectedCheckpoint(checkpoint);
    setQrDialogOpen(true);
  };

  const handleDownloadQr = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx?.drawImage(img, 0, 0, 300, 300);
      const link = document.createElement('a');
      link.download = `qr-${selectedCheckpoint?.name || 'checkpoint'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="w-64">
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger>
              <SelectValue placeholder="筛选站点" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部站点</SelectItem>
              {sites?.map((site) => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          添加检查点
        </Button>
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
              <TableHead>二维码</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">加载中...</TableCell>
              </TableRow>
            ) : checkpoints?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无检查点数据</TableCell>
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
                    ) : '-'}
                  </TableCell>
                  <TableCell>{checkpoint.order_index}</TableCell>
                  <TableCell>
                    {checkpoint.qr_code ? (
                      <Button variant="ghost" size="icon" onClick={() => handleShowQr(checkpoint)} title="查看二维码">
                        <QrCode className="w-4 h-4 text-primary" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">无</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      checkpoint.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {checkpoint.status === 'active' ? '启用' : '停用'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(checkpoint)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(checkpoint.id)}>
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

      {/* Checkpoint Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCheckpoint ? '编辑检查点' : '添加检查点'}</DialogTitle>
            <DialogDescription>
              {editingCheckpoint ? '修改检查点信息' : '填写新检查点信息，二维码将自动生成'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>检查点名称 *</FormLabel>
                    <FormControl><Input {...field} placeholder="输入检查点名称" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>检查点编号</FormLabel>
                    <FormControl><Input {...field} placeholder="输入检查点编号" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="site_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>所属站点 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="选择站点" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sites?.map((site) => (
                        <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="nfc_code" render={({ field }) => (
                <FormItem>
                  <FormLabel>NFC标签</FormLabel>
                  <FormControl><Input {...field} placeholder="输入NFC标签数据（可选）" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="latitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>纬度</FormLabel>
                    <FormControl><Input {...field} placeholder="例: 39.9042" type="number" step="any" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="longitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>经度</FormLabel>
                    <FormControl><Input {...field} placeholder="例: 116.4074" type="number" step="any" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="order_index" render={({ field }) => (
                  <FormItem>
                    <FormLabel>顺序</FormLabel>
                    <FormControl><Input {...field} placeholder="0" type="number" /></FormControl>
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
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="inactive">停用</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                💡 二维码将在创建/更新时自动生成，无需手动输入
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
                <Button type="submit">{editingCheckpoint ? '更新' : '创建'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* QR Code Preview Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>检查点二维码</DialogTitle>
            <DialogDescription>{selectedCheckpoint?.name} - {selectedCheckpoint?.sites?.name}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4" ref={qrRef}>
            {selectedCheckpoint?.qr_code && (
              <QRCodeSVG
                value={selectedCheckpoint.qr_code}
                size={200}
                level="H"
                includeMargin
              />
            )}
            <p className="text-xs text-muted-foreground text-center max-w-[200px] break-all">
              {selectedCheckpoint?.name}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>关闭</Button>
            <Button onClick={handleDownloadQr}>
              <Download className="w-4 h-4 mr-2" />
              下载二维码
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
