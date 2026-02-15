import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useExport } from '@/hooks/use-export';
import { Pencil, Trash2, Eye, FileText, Download, FileSpreadsheet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

const reportSchema = z.object({
  plan_id: z.string().optional(),
  guard_id: z.string().optional(),
  site_id: z.string().optional(),
  start_time: z.string().min(1),
  end_time: z.string().optional(),
  status: z.string().default('in_progress'),
  notes: z.string().optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

export default function PatrolReports() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [viewingReport, setViewingReport] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { exportToCSV, exportToPDF } = useExport();

  const form = useForm<ReportFormData>({ resolver: zodResolver(reportSchema), defaultValues: { plan_id: '', guard_id: '', site_id: '', start_time: '', end_time: '', status: 'in_progress', notes: '' } });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['patrol-reports'],
    queryFn: async () => { const { data, error } = await supabase.from('patrol_reports').select('*').order('created_at', { ascending: false }); if (error) throw error; return data || []; },
  });

  const { data: plans = [] } = useQuery({ queryKey: ['patrol-plans'], queryFn: async () => { const { data, error } = await supabase.from('patrol_plans').select('id, name').eq('status', 'active'); if (error) throw error; return data || []; } });
  const { data: guardProfiles = [] } = useQuery({ queryKey: ['guard-profiles'], queryFn: async () => { const { data, error } = await supabase.from('profiles').select('id, full_name, employee_id').eq('guard_status', 'active'); if (error) throw error; return data || []; } });
  const { data: sites = [] } = useQuery({ queryKey: ['sites'], queryFn: async () => { const { data, error } = await supabase.from('sites').select('id, name').eq('status', 'active'); if (error) throw error; return data || []; } });

  const { data: reportCheckpoints = [] } = useQuery({
    queryKey: ['report-checkpoints', viewingReport?.id],
    queryFn: async () => { if (!viewingReport?.id) return []; const { data, error } = await supabase.from('patrol_report_checkpoints').select('*, checkpoints:checkpoint_id(name)').eq('report_id', viewingReport.id).order('visited_at', { ascending: true }); if (error) throw error; return data || []; },
    enabled: !!viewingReport?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ReportFormData & { id: string }) => {
      const { error } = await supabase.from('patrol_reports').update({ plan_id: data.plan_id || null, guard_id: data.guard_id || null, site_id: data.site_id || null, start_time: data.start_time, end_time: data.end_time || null, status: data.status, notes: data.notes || null }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['patrol-reports'] }); toast({ title: t('common.updateSuccess') }); setIsDialogOpen(false); setEditingReport(null); form.reset(); },
    onError: (error: any) => { toast({ title: t('common.updateFailed'), description: error.message, variant: 'destructive' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('patrol_reports').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['patrol-reports'] }); toast({ title: t('common.deleteSuccess') }); },
    onError: (error: any) => { toast({ title: t('common.deleteFailed'), description: error.message, variant: 'destructive' }); },
  });

  const onSubmit = (data: ReportFormData) => { if (editingReport) { updateMutation.mutate({ ...data, id: editingReport.id }); } };

  const handleEdit = (report: any) => {
    setEditingReport(report);
    form.reset({ plan_id: report.plan_id || '', guard_id: report.guard_id || '', site_id: report.site_id || '', start_time: report.start_time ? format(new Date(report.start_time), "yyyy-MM-dd'T'HH:mm") : '', end_time: report.end_time ? format(new Date(report.end_time), "yyyy-MM-dd'T'HH:mm") : '', status: report.status || 'in_progress', notes: report.notes || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => { if (confirm(t('patrolReports.deleteConfirm'))) { deleteMutation.mutate(id); } };

  const getPlanName = (planId: string | null) => { if (!planId) return '-'; return plans.find((p) => p.id === planId)?.name || '-'; };
  const getGuardName = (guardId: string | null) => { if (!guardId) return '-'; return guardProfiles.find((g) => g.id === guardId)?.full_name || '-'; };
  const getSiteName = (siteId: string | null) => { if (!siteId) return '-'; return sites.find((s) => s.id === siteId)?.name || '-'; };

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { in_progress: 'default', completed: 'secondary', cancelled: 'destructive' };
    const labels: Record<string, string> = { in_progress: t('patrolReports.statusInProgress'), completed: t('patrolReports.statusCompleted'), cancelled: t('patrolReports.statusCancelled') };
    return <Badge variant={variants[status || 'in_progress'] || 'outline'}>{labels[status || 'in_progress'] || status}</Badge>;
  };

  const formatDateTime = (dateStr: string | null) => { if (!dateStr) return '-'; return format(new Date(dateStr), 'yyyy-MM-dd HH:mm'); };

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = { in_progress: t('patrolReports.statusInProgress'), completed: t('patrolReports.statusCompleted'), cancelled: t('patrolReports.statusCancelled') };
    return labels[status || 'in_progress'] || status || t('patrolReports.statusInProgress');
  };

  const handleExportCSV = () => {
    const columns = [
      { header: t('patrolReports.planName'), accessor: (row: any) => getPlanName(row.plan_id) },
      { header: t('patrolReports.guard'), accessor: (row: any) => getGuardName(row.guard_id) },
      { header: t('patrolReports.site'), accessor: (row: any) => getSiteName(row.site_id) },
      { header: t('patrolReports.startTime'), accessor: (row: any) => formatDateTime(row.start_time) },
      { header: t('patrolReports.endTime'), accessor: (row: any) => formatDateTime(row.end_time) },
      { header: t('patrolReports.status'), accessor: (row: any) => getStatusLabel(row.status) },
      { header: t('common.notes'), accessor: (row: any) => row.notes || '' },
    ];
    exportToCSV(reports, columns, `patrol_reports_${format(new Date(), 'yyyyMMdd_HHmmss')}`);
    toast({ title: t('common.exportSuccess'), description: t('common.csvDownloaded') });
  };

  const handleExportPDF = () => {
    const columns = [
      { header: t('patrolReports.planName'), accessor: (row: any) => getPlanName(row.plan_id) },
      { header: t('patrolReports.guard'), accessor: (row: any) => getGuardName(row.guard_id) },
      { header: t('patrolReports.site'), accessor: (row: any) => getSiteName(row.site_id) },
      { header: t('patrolReports.startTime'), accessor: (row: any) => formatDateTime(row.start_time) },
      { header: t('patrolReports.endTime'), accessor: (row: any) => formatDateTime(row.end_time) },
      { header: t('patrolReports.status'), accessor: (row: any) => getStatusLabel(row.status) },
    ];
    exportToPDF(reports, columns, `patrol_reports_${format(new Date(), 'yyyyMMdd_HHmmss')}`, t('patrolReports.title'));
    toast({ title: t('common.exportSuccess'), description: t('common.pdfDownloaded') });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('patrolReports.title')}</h1>
          <p className="text-muted-foreground">{t('patrolReports.description')}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={reports.length === 0}><Download className="h-4 w-4 mr-2" />{t('common.export')}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV}><FileSpreadsheet className="h-4 w-4 mr-2" />{t('common.exportCSV')}</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}><FileText className="h-4 w-4 mr-2" />{t('common.exportPDF')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('patrolReports.planName')}</TableHead>
              <TableHead>{t('patrolReports.guard')}</TableHead>
              <TableHead>{t('patrolReports.site')}</TableHead>
              <TableHead>{t('patrolReports.startTime')}</TableHead>
              <TableHead>{t('patrolReports.endTime')}</TableHead>
              <TableHead>{t('patrolReports.status')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">{t('common.loading')}</TableCell></TableRow>
            ) : reports.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('patrolReports.noReports')}</TableCell></TableRow>
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
                    <Button variant="ghost" size="icon" onClick={() => setViewingReport(report)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(report)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(report.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingReport(null); form.reset(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('patrolReports.editReport')}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="plan_id" render={({ field }) => (
                <FormItem><FormLabel>{t('patrolReports.patrolPlan')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('patrolReports.selectPlan')} /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="">{t('patrolReports.unspecified')}</SelectItem>{plans.map((plan) => (<SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="guard_id" render={({ field }) => (
                  <FormItem><FormLabel>{t('patrolReports.guard')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('patrolReports.selectGuard')} /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="">{t('patrolReports.unspecified')}</SelectItem>{guardProfiles.map((g) => (<SelectItem key={g.id} value={g.id}>{g.full_name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="site_id" render={({ field }) => (
                  <FormItem><FormLabel>{t('patrolReports.site')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('patrolReports.selectSite')} /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="">{t('patrolReports.unspecified')}</SelectItem>{sites.map((site) => (<SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="start_time" render={({ field }) => (
                  <FormItem><FormLabel>{t('patrolReports.startTime')} *</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="end_time" render={({ field }) => (
                  <FormItem><FormLabel>{t('patrolReports.endTime')}</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>{t('common.status')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="in_progress">{t('patrolReports.statusInProgress')}</SelectItem><SelectItem value="completed">{t('patrolReports.statusCompleted')}</SelectItem><SelectItem value="cancelled">{t('patrolReports.statusCancelled')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>{t('common.notes')}</FormLabel><FormControl><Textarea placeholder={t('common.notes')} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={updateMutation.isPending}>{t('common.update')}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{t('patrolReports.title')}</DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">{t('patrolReports.planName')}：</span><span className="font-medium">{getPlanName(viewingReport.plan_id)}</span></div>
                <div><span className="text-muted-foreground">{t('patrolReports.guard')}：</span><span className="font-medium">{getGuardName(viewingReport.guard_id)}</span></div>
                <div><span className="text-muted-foreground">{t('patrolReports.site')}：</span><span className="font-medium">{getSiteName(viewingReport.site_id)}</span></div>
                <div><span className="text-muted-foreground">{t('common.status')}：</span>{getStatusBadge(viewingReport.status)}</div>
                <div><span className="text-muted-foreground">{t('patrolReports.startTime')}：</span><span className="font-medium">{formatDateTime(viewingReport.start_time)}</span></div>
                <div><span className="text-muted-foreground">{t('patrolReports.endTime')}：</span><span className="font-medium">{formatDateTime(viewingReport.end_time)}</span></div>
              </div>
              {viewingReport.notes && (<div><span className="text-muted-foreground text-sm">{t('common.notes')}：</span><p className="mt-1">{viewingReport.notes}</p></div>)}
              <div>
                <h3 className="font-medium mb-2">{t('patrolDetail.checkpointRecords')}</h3>
                {reportCheckpoints.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('patrolDetail.noCheckpoints')}</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>{t('patrol.checkpoint')}</TableHead>
                        <TableHead>{t('common.time')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {reportCheckpoints.map((cp: any) => (
                          <TableRow key={cp.id}>
                            <TableCell>{cp.checkpoints?.name || '-'}</TableCell>
                            <TableCell>{formatDateTime(cp.visited_at)}</TableCell>
                            <TableCell><Badge variant={cp.status === 'completed' ? 'default' : 'secondary'}>{cp.status}</Badge></TableCell>
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
