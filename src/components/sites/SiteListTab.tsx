import { useState } from 'react';
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
import { Plus, Pencil, Trash2, MapPin, QrCode, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';

const siteSchema = z.object({
  name: z.string().min(1, '站点名称不能为空'),
  code: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string().default('UTC+8'),
  status: z.enum(['active', 'inactive']),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  company_id: z.string().uuid().nullable().optional(),
});

type SiteFormData = z.infer<typeof siteSchema>;

export default function SiteListTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<any>(null);
  const [qrSite, setQrSite] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: '', code: '', address: '', timezone: 'UTC+8',
      status: 'active', latitude: '', longitude: '', company_id: null,
    },
  });

  const { data: sites, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('*, companies(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies').select('id, name').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SiteFormData) => {
      const { error } = await supabase.from('sites').insert([{
        name: data.name, code: data.code || null, address: data.address || null,
        timezone: data.timezone, status: data.status,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        company_id: data.company_id || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({ title: '创建成功', description: '站点已创建' });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: '创建失败', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SiteFormData & { id: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase.from('sites').update({
        name: updateData.name, code: updateData.code || null, address: updateData.address || null,
        timezone: updateData.timezone, status: updateData.status,
        latitude: updateData.latitude ? parseFloat(updateData.latitude) : null,
        longitude: updateData.longitude ? parseFloat(updateData.longitude) : null,
        company_id: updateData.company_id || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({ title: '更新成功', description: '站点已更新' });
      setIsDialogOpen(false);
      setEditingSite(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: '更新失败', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sites').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({ title: '删除成功', description: '站点已删除' });
    },
    onError: (error: any) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (site?: any) => {
    if (site) {
      setEditingSite(site);
      form.reset({
        name: site.name, code: site.code || '', address: site.address || '',
        timezone: site.timezone || 'UTC+8', status: site.status,
        latitude: site.latitude?.toString() || '', longitude: site.longitude?.toString() || '',
        company_id: site.company_id,
      });
    } else {
      setEditingSite(null);
      form.reset({
        name: '', code: '', address: '', timezone: 'UTC+8',
        status: 'active', latitude: '', longitude: '', company_id: null,
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: SiteFormData) => {
    if (editingSite) {
      updateMutation.mutate({ ...data, id: editingSite.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          添加站点
        </Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>站点名称</TableHead>
              <TableHead>站点编号</TableHead>
              <TableHead>所属公司</TableHead>
              <TableHead>地址</TableHead>
              <TableHead>位置</TableHead>
              <TableHead>二维码</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">加载中...</TableCell>
              </TableRow>
            ) : sites?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无站点数据</TableCell>
              </TableRow>
            ) : (
              sites?.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-medium">{site.name}</TableCell>
                  <TableCell>{site.code || '-'}</TableCell>
                  <TableCell>{site.companies?.name || '-'}</TableCell>
                  <TableCell>{site.address || '-'}</TableCell>
                  <TableCell>
                    {site.latitude && site.longitude ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">
                          {Number(site.latitude).toFixed(4)}, {Number(site.longitude).toFixed(4)}
                        </span>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setQrSite(site)}>
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      site.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {site.status === 'active' ? '启用' : '停用'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(site)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(site.id)}>
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
            <DialogTitle>{editingSite ? '编辑站点' : '添加站点'}</DialogTitle>
            <DialogDescription>{editingSite ? '修改站点信息' : '填写新站点信息'}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>站点名称 *</FormLabel>
                    <FormControl><Input {...field} placeholder="输入站点名称" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>站点编号</FormLabel>
                    <FormControl><Input {...field} placeholder="输入站点编号" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="company_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>所属公司</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="选择公司" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies?.map((company) => (
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
                  <FormControl><Input {...field} placeholder="输入站点地址" /></FormControl>
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
                <FormField control={form.control} name="timezone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>时区</FormLabel>
                    <FormControl><Input {...field} placeholder="UTC+8" /></FormControl>
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
                <Button type="submit">{editingSite ? '更新' : '创建'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {qrSite && (
        <Dialog open={!!qrSite} onOpenChange={() => setQrSite(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>站点签到二维码</DialogTitle>
              <DialogDescription>{qrSite.name}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div id="site-qr-code" className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  value={JSON.stringify({ type: 'site_checkin', site_id: qrSite.id, site_name: qrSite.name, code: qrSite.code })}
                  size={200}
                  level="H"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">保安扫描此二维码进行打卡签到</p>
              <Button onClick={() => {
                const svg = document.querySelector('#site-qr-code svg') as SVGSVGElement;
                if (!svg) return;
                const canvas = document.createElement('canvas');
                canvas.width = 250; canvas.height = 250;
                const ctx = canvas.getContext('2d')!;
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, 250, 250);
                const img = new Image();
                const svgData = new XMLSerializer().serializeToString(svg);
                img.onload = () => {
                  ctx.drawImage(img, 25, 25, 200, 200);
                  const a = document.createElement('a');
                  a.download = `site-${qrSite.name}-qr.png`;
                  a.href = canvas.toDataURL('image/png');
                  a.click();
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
              }}>
                <Download className="w-4 h-4 mr-2" />
                下载二维码
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
