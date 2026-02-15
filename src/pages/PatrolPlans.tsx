import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const planSchema = z.object({
  name: z.string().min(1),
  site_id: z.string().min(1),
  guard_id: z.string().optional(),
  frequency: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default('active'),
});

type PlanFormData = z.infer<typeof planSchema>;

export default function PatrolPlans() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PlanFormData>({ resolver: zodResolver(planSchema), defaultValues: { name: '', site_id: '', guard_id: '', frequency: '', notes: '', status: 'active' } });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['patrol-plans'],
    queryFn: async () => { const { data, error } = await supabase.from('patrol_plans').select('*').order('created_at', { ascending: false }); if (error) throw error; return data || []; },
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => { const { data, error } = await supabase.from('sites').select('id, name').eq('status', 'active'); if (error) throw error; return data || []; },
  });

  const { data: guardProfiles = [] } = useQuery({
    queryKey: ['guard-profiles'],
    queryFn: async () => { const { data, error } = await supabase.from('profiles').select('id, full_name, employee_id').eq('guard_status', 'active'); if (error) throw error; return data || []; },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error } = await supabase.from('patrol_plans').insert({ name: data.name, site_id: data.site_id, guard_id: data.guard_id || null, start_date: today, end_date: '2099-12-31', frequency: data.frequency || null, notes: data.notes || null, status: data.status });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['patrol-plans'] }); toast({ title: t('common.createSuccess') }); setIsDialogOpen(false); form.reset(); },
    onError: (error: any) => { toast({ title: t('common.createFailed'), description: error.message, variant: 'destructive' }); },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PlanFormData & { id: string }) => {
      const { error } = await supabase.from('patrol_plans').update({ name: data.name, site_id: data.site_id, guard_id: data.guard_id || null, frequency: data.frequency || null, notes: data.notes || null, status: data.status }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['patrol-plans'] }); toast({ title: t('common.updateSuccess') }); setIsDialogOpen(false); setEditingPlan(null); form.reset(); },
    onError: (error: any) => { toast({ title: t('common.updateFailed'), description: error.message, variant: 'destructive' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('patrol_plans').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['patrol-plans'] }); toast({ title: t('common.deleteSuccess') }); },
    onError: (error: any) => { toast({ title: t('common.deleteFailed'), description: error.message, variant: 'destructive' }); },
  });

  const onSubmit = (data: PlanFormData) => { if (editingPlan) { updateMutation.mutate({ ...data, id: editingPlan.id }); } else { createMutation.mutate(data); } };

  const handleEdit = (plan: any) => { setEditingPlan(plan); form.reset({ name: plan.name, site_id: plan.site_id, guard_id: plan.guard_id || '', frequency: plan.frequency || '', notes: plan.notes || '', status: plan.status }); setIsDialogOpen(true); };

  const handleDelete = (id: string) => { if (confirm(t('patrolPlans.deleteConfirm'))) { deleteMutation.mutate(id); } };

  const getSiteName = (siteId: string) => sites.find((s) => s.id === siteId)?.name || '-';
  const getGuardName = (guardId: string | null) => { if (!guardId) return '-'; const p = guardProfiles.find((g) => g.id === guardId); return p?.full_name || '-'; };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = { active: 'default', inactive: 'secondary', completed: 'destructive' };
    const labels: Record<string, string> = { active: t('patrolPlans.statusActive'), inactive: t('patrolPlans.statusInactive'), completed: t('patrolPlans.statusCompleted') };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const getFrequencyLabel = (frequency: string | null) => { if (!frequency) return '-'; return `${t('patrolPlans.every')} ${frequency} ${t('patrolPlans.patrol')}`; };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('patrolPlans.title')}</h1>
          <p className="text-muted-foreground">{t('patrolPlans.description')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingPlan(null); form.reset(); } }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />{t('patrolPlans.addPlan')}</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingPlan ? t('patrolPlans.editPlan') : t('patrolPlans.addPlan')}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t('patrolPlans.planName')} *</FormLabel><FormControl><Input placeholder={t('patrolPlans.enterPlanName')} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="site_id" render={({ field }) => (
                    <FormItem><FormLabel>{t('patrolPlans.site')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('patrolPlans.selectSite')} /></SelectTrigger></FormControl>
                        <SelectContent>{sites.map((site) => (<SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="guard_id" render={({ field }) => (
                    <FormItem><FormLabel>{t('patrolPlans.responsibleGuard')}</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === 'none' ? '' : val)} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder={t('patrolPlans.selectGuard')} /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="none">{t('patrolReports.unspecified')}</SelectItem>{guardProfiles.map((g) => (<SelectItem key={g.id} value={g.id}>{g.full_name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="frequency" render={({ field }) => (
                    <FormItem><FormLabel>{t('patrolPlans.frequency')}</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>{t('common.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="active">{t('patrolPlans.statusActive')}</SelectItem><SelectItem value="inactive">{t('patrolPlans.statusInactive')}</SelectItem><SelectItem value="completed">{t('patrolPlans.statusCompleted')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>{t('common.notes')}</FormLabel><FormControl><Textarea placeholder={t('common.notes')} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editingPlan ? t('common.update') : t('common.create')}</Button>
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
              <TableHead>{t('patrolPlans.planName')}</TableHead>
              <TableHead>{t('patrolPlans.site')}</TableHead>
              <TableHead>{t('patrolPlans.responsibleGuard')}</TableHead>
              <TableHead>{t('patrolPlans.frequency')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">{t('common.loading')}</TableCell></TableRow>
            ) : plans.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('patrolPlans.noPlans')}</TableCell></TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{getSiteName(plan.site_id)}</TableCell>
                  <TableCell>{getGuardName(plan.guard_id)}</TableCell>
                  <TableCell>{getFrequencyLabel(plan.frequency)}</TableCell>
                  <TableCell>{getStatusBadge(plan.status || 'active')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4" /></Button>
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
