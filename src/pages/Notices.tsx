import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, CalendarIcon, Bell } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const noticeSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  priority: z.string().default('normal'),
  status: z.string().default('active'),
  start_date: z.date({ required_error: 'Required' }),
  end_date: z.date({ required_error: 'Required' }),
  target_roles: z.array(z.string()).optional(),
});

type NoticeFormValues = z.infer<typeof noticeSchema>;

export default function Notices() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<NoticeFormValues>({
    resolver: zodResolver(noticeSchema),
    defaultValues: { title: '', content: '', priority: 'normal', status: 'active', target_roles: [] },
  });

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: NoticeFormValues) => {
      const { error } = await supabase.from('notices').insert({ title: values.title, content: values.content || null, priority: values.priority, status: values.status, start_date: values.start_date.toISOString(), end_date: values.end_date.toISOString(), target_roles: values.target_roles || null });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notices'] }); toast({ title: t('common.createSuccess') }); setIsDialogOpen(false); form.reset(); },
    onError: (error: any) => { toast({ title: t('common.createFailed'), description: error.message, variant: 'destructive' }); },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: NoticeFormValues & { id: string }) => {
      const { error } = await supabase.from('notices').update({ title: values.title, content: values.content || null, priority: values.priority, status: values.status, start_date: values.start_date.toISOString(), end_date: values.end_date.toISOString(), target_roles: values.target_roles || null }).eq('id', values.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notices'] }); toast({ title: t('common.updateSuccess') }); setIsDialogOpen(false); setEditingNotice(null); form.reset(); },
    onError: (error: any) => { toast({ title: t('common.updateFailed'), description: error.message, variant: 'destructive' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('notices').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notices'] }); toast({ title: t('common.deleteSuccess') }); },
    onError: (error: any) => { toast({ title: t('common.deleteFailed'), description: error.message, variant: 'destructive' }); },
  });

  const onSubmit = (values: NoticeFormValues) => { if (editingNotice) { updateMutation.mutate({ ...values, id: editingNotice.id }); } else { createMutation.mutate(values); } };

  const handleEdit = (notice: any) => {
    setEditingNotice(notice);
    form.reset({ title: notice.title, content: notice.content || '', priority: notice.priority || 'normal', status: notice.status || 'active', start_date: new Date(notice.start_date), end_date: new Date(notice.end_date), target_roles: notice.target_roles || [] });
    setIsDialogOpen(true);
  };

  const handleAdd = () => { setEditingNotice(null); form.reset({ title: '', content: '', priority: 'normal', status: 'active', target_roles: [] }); setIsDialogOpen(true); };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">{t('notices.priorityHigh')}</Badge>;
      case 'normal': return <Badge variant="secondary">{t('notices.priorityNormal')}</Badge>;
      case 'low': return <Badge variant="outline">{t('notices.priorityLow')}</Badge>;
      default: return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">{t('notices.statusActive')}</Badge>;
      case 'inactive': return <Badge variant="outline">{t('notices.statusInactive')}</Badge>;
      case 'expired': return <Badge variant="secondary">{t('notices.statusExpired')}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('notices.title')}</h1>
            <p className="text-muted-foreground">{t('notices.description')}</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd}><Plus className="mr-2 h-4 w-4" />{t('notices.addNotice')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingNotice ? t('notices.editNotice') : t('notices.addNotice')}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>{t('notices.noticeTitle')}</FormLabel><FormControl><Input placeholder={t('notices.enterTitle')} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem><FormLabel>{t('notices.noticeContent')}</FormLabel><FormControl><Textarea placeholder={t('notices.enterContent')} rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem><FormLabel>{t('notices.priority')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('notices.selectPriority')} /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="high">{t('notices.priorityHigh')}</SelectItem><SelectItem value="normal">{t('notices.priorityNormal')}</SelectItem><SelectItem value="low">{t('notices.priorityLow')}</SelectItem></SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>{t('common.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="active">{t('notices.statusActive')}</SelectItem><SelectItem value="inactive">{t('notices.statusInactive')}</SelectItem></SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="start_date" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>{t('notices.startDate')}</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                          {field.value ? format(field.value, 'yyyy-MM-dd') : t('common.selectDate')}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" /></PopoverContent>
                      </Popover><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="end_date" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>{t('notices.endDate')}</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                          {field.value ? format(field.value, 'yyyy-MM-dd') : t('common.selectDate')}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" /></PopoverContent>
                      </Popover><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editingNotice ? t('common.save') : t('common.create')}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('notices.noticeTitle')}</TableHead>
              <TableHead>{t('notices.priority')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('notices.effectiveTime')}</TableHead>
              <TableHead>{t('notices.createdAt')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">{t('common.loading')}</TableCell></TableRow>
            ) : notices.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('notices.noNotices')}</TableCell></TableRow>
            ) : (
              notices.map((notice) => (
                <TableRow key={notice.id}>
                  <TableCell className="font-medium">{notice.title}</TableCell>
                  <TableCell>{getPriorityBadge(notice.priority || 'normal')}</TableCell>
                  <TableCell>{getStatusBadge(notice.status || 'active')}</TableCell>
                  <TableCell>{format(new Date(notice.start_date), 'yyyy-MM-dd')} ~ {format(new Date(notice.end_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{notice.created_at ? format(new Date(notice.created_at), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(notice)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(notice.id)}><Trash2 className="h-4 w-4" /></Button>
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
