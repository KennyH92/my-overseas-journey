import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CheckCircle2, LogIn, LogOut, MapPin, Clock, XCircle, ScanLine, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import MissingCheckoutDialog from '@/components/scan/MissingCheckoutDialog';

interface QRData { type: string; site_id: string; site_name: string; code?: string; }
type ScanResult = { status: 'check_in' | 'check_out'; site_name: string; time: string; } | null;
interface UnresolvedRecord { id: string; site_name: string; pending_site_id: string; pending_site_name: string; }

export default function ScanCheckIn() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const [unresolvedRecord, setUnresolvedRecord] = useState<UnresolvedRecord | null>(null);

  const { data: guard } = useQuery({
    queryKey: ['my-guard', user?.id],
    queryFn: async () => { if (!user?.id) return null; const { data, error } = await supabase.from('guards').select('id, name').eq('user_id', user.id).eq('status', 'active').maybeSingle(); if (error) throw error; return data; },
    enabled: !!user?.id,
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayRecords = [], refetch: refetchRecords } = useQuery({
    queryKey: ['site-attendance-today', guard?.id, today],
    queryFn: async () => { if (!guard?.id) return []; const { data, error } = await supabase.from('site_attendance').select('*, sites(name, address)').eq('guard_id', guard.id).eq('date', today).order('check_in_time', { ascending: false }); if (error) throw error; return data || []; },
    enabled: !!guard?.id,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ oldRecordId, fixOutTime, newSiteId }: { oldRecordId: string; fixOutTime: string; newSiteId?: string }) => {
      if (!guard?.id) throw new Error(t('scanCheckIn.noGuardRecord'));
      const { error: updateErr } = await supabase.from('site_attendance').update({ check_out_time: fixOutTime, status: 'late_close' }).eq('id', oldRecordId);
      if (updateErr) throw updateErr;
      if (newSiteId) {
        const { error: insertErr } = await supabase.from('site_attendance').insert({ guard_id: guard.id, site_id: newSiteId, date: today, check_in_time: new Date().toISOString(), status: 'checked_in' });
        if (insertErr) throw insertErr;
        return { action: 'resolved_and_checked_in' as const };
      }
      return { action: 'resolved' as const };
    },
    onSuccess: () => { refetchRecords(); queryClient.invalidateQueries({ queryKey: ['site-attendance-today'] }); },
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ siteId, siteName }: { siteId: string; siteName: string }) => {
      if (!guard?.id) throw new Error(t('scanCheckIn.noGuardRecord'));
      const { data: unresolvedRecords, error: checkErr } = await supabase.from('site_attendance').select('id, site_id, sites(name)').eq('guard_id', guard.id).eq('status', 'checked_in');
      if (checkErr) throw checkErr;
      if (unresolvedRecords && unresolvedRecords.length > 0) {
        const oldRecord = unresolvedRecords[0] as any;
        const isSameSiteToday = oldRecord.site_id === siteId && todayRecords.some((r: any) => r.site_id === siteId && r.status === 'checked_in');
        if (isSameSiteToday) {
          const { error } = await supabase.from('site_attendance').update({ check_out_time: new Date().toISOString(), status: 'checked_out' }).eq('id', oldRecord.id);
          if (error) throw error;
          return { action: 'check_out' as const };
        }
        throw { isConflict: true, recordId: oldRecord.id, siteName: oldRecord.sites?.name || t('scanCheckIn.unknownSite'), pendingSiteId: siteId, pendingSiteName: siteName };
      }
      const { error } = await supabase.from('site_attendance').insert({ guard_id: guard.id, site_id: siteId, date: today, check_in_time: new Date().toISOString(), status: 'checked_in' });
      if (error) { if (error.code === '23505') { throw new Error(t('scanCheckIn.invalidQR')); } throw error; }
      return { action: 'check_in' as const };
    },
  });

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const qrData: QRData = JSON.parse(decodedText);
      if (qrData.type !== 'site_checkin' || !qrData.site_id) { setError(t('scanCheckIn.invalidQR')); processingRef.current = false; return; }
      if (scannerRef.current?.isScanning) { await scannerRef.current.stop(); }
      setScanning(false);
      const result = await checkInMutation.mutateAsync({ siteId: qrData.site_id, siteName: qrData.site_name });
      setScanResult({ status: result.action, site_name: qrData.site_name, time: format(new Date(), 'HH:mm:ss') });
      toast({ title: result.action === 'check_in' ? t('scanCheckIn.checkInSuccess') : t('scanCheckIn.checkOutSuccess'), description: `${qrData.site_name} - ${format(new Date(), 'HH:mm:ss')}` });
      refetchRecords(); queryClient.invalidateQueries({ queryKey: ['site-attendance-today'] });
    } catch (err: any) {
      if (err.isConflict) { setUnresolvedRecord({ id: err.recordId, site_name: err.siteName, pending_site_id: err.pendingSiteId, pending_site_name: err.pendingSiteName }); }
      else { setError(err.message || t('scanCheckIn.scanFailed')); toast({ title: t('scanCheckIn.operationFailed'), description: err.message, variant: 'destructive' }); }
    } finally { processingRef.current = false; }
  }, [checkInMutation, toast, refetchRecords, queryClient, t]);

  const handleResolveConfirm = async (recordId: string, fixOutTime: string) => {
    try {
      const result = await resolveMutation.mutateAsync({ oldRecordId: recordId, fixOutTime, newSiteId: unresolvedRecord?.pending_site_id });
      setUnresolvedRecord(null);
      if (result.action === 'resolved_and_checked_in') {
        setScanResult({ status: 'check_in', site_name: unresolvedRecord?.pending_site_name || '', time: format(new Date(), 'HH:mm:ss') });
        toast({ title: t('scanCheckIn.checkInSuccess'), description: `${unresolvedRecord?.pending_site_name} - ${format(new Date(), 'HH:mm:ss')}` });
      } else { toast({ title: t('common.updateSuccess') }); }
    } catch (err: any) { toast({ title: t('scanCheckIn.operationFailed'), description: err.message, variant: 'destructive' }); }
  };

  const startScanner = async () => {
    setError(null); setScanResult(null); setScanning(true);
    try { const scanner = new Html5Qrcode('qr-reader'); scannerRef.current = scanner; await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, handleScanSuccess, () => {}); }
    catch { setError(t('scanCheckIn.cameraError')); setScanning(false); }
  };

  const stopScanner = async () => { if (scannerRef.current?.isScanning) { await scannerRef.current.stop(); } setScanning(false); };

  useEffect(() => { return () => { if (scannerRef.current?.isScanning) { scannerRef.current.stop().catch(() => {}); } }; }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in': return <Badge variant="outline" className="text-xs">{t('scanCheckIn.onDuty')}</Badge>;
      case 'checked_out': return null;
      case 'system_auto_closed': return <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="w-3 h-3" />{t('scanCheckIn.systemCut')}</Badge>;
      case 'late_close': return <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="w-3 h-3" />{t('scanCheckIn.lateClose')}</Badge>;
      default: return null;
    }
  };

  if (!guard) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold text-foreground">{t('scanCheckIn.title')}</h1><p className="text-muted-foreground mt-1">{t('scanCheckIn.description')}</p></div>
        <Card><CardContent className="py-12 text-center"><XCircle className="w-12 h-12 mx-auto text-destructive mb-4" /><p className="text-lg font-medium">{t('scanCheckIn.noGuardRecord')}</p><p className="text-muted-foreground mt-1">{t('scanCheckIn.contactAdmin')}</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-foreground">{t('scanCheckIn.title')}</h1><p className="text-muted-foreground mt-1">{t('scanCheckIn.description')}</p></div>
      <MissingCheckoutDialog open={!!unresolvedRecord} siteName={unresolvedRecord?.site_name || ''} recordId={unresolvedRecord?.id || ''} onConfirm={handleResolveConfirm} onCancel={() => setUnresolvedRecord(null)} />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ScanLine className="w-5 h-5" />{t('scanCheckIn.qrScanner')}</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div id="qr-reader" className={`w-full max-w-sm rounded-lg overflow-hidden ${scanning ? 'border-2 border-primary' : 'bg-muted'}`} style={{ minHeight: scanning ? 300 : 0 }} />
          {!scanning && !scanResult && (<Button onClick={startScanner} size="lg" className="gap-2"><Camera className="w-5 h-5" />{t('scanCheckIn.startScan')}</Button>)}
          {scanning && (<Button onClick={stopScanner} variant="outline" size="lg" className="gap-2">{t('scanCheckIn.cancelScan')}</Button>)}
          {error && (<div className="text-center text-destructive"><XCircle className="w-8 h-8 mx-auto mb-2" /><p>{error}</p><Button onClick={startScanner} variant="outline" className="mt-3">{t('scanCheckIn.reScan')}</Button></div>)}
          {scanResult && (
            <div className="text-center space-y-3">
              <CheckCircle2 className={`w-16 h-16 mx-auto ${scanResult.status === 'check_in' ? 'text-green-500' : 'text-blue-500'}`} />
              <div><Badge variant={scanResult.status === 'check_in' ? 'default' : 'secondary'} className="text-base px-4 py-1">{scanResult.status === 'check_in' ? t('scanCheckIn.checkInSuccess') : t('scanCheckIn.checkOutSuccess')}</Badge></div>
              <p className="text-lg font-semibold">{scanResult.site_name}</p>
              <p className="text-muted-foreground flex items-center justify-center gap-1"><Clock className="w-4 h-4" />{scanResult.time}</p>
              <Button onClick={startScanner} variant="outline" className="mt-2">{t('scanCheckIn.continueScan')}</Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />{t('scanCheckIn.todayRecords')}</CardTitle></CardHeader>
        <CardContent>
          {todayRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">{t('scanCheckIn.noRecordsToday')}</p>
          ) : (
            <div className="space-y-3">
              {todayRecords.map((record: any) => {
                const isAbnormal = record.status === 'system_auto_closed' || record.status === 'late_close';
                return (
                  <div key={record.id} className={`flex items-center justify-between p-3 rounded-lg border ${isAbnormal ? 'border-destructive/50 bg-destructive/5' : 'bg-card'}`}>
                    <div className="flex items-center gap-3">
                      <MapPin className={`w-5 h-5 ${isAbnormal ? 'text-destructive' : 'text-primary'}`} />
                      <div><p className="font-medium">{record.sites?.name || t('scanCheckIn.unknownSite')}</p><p className="text-sm text-muted-foreground">{record.sites?.address || ''}</p></div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2"><LogIn className="w-4 h-4 text-green-500" /><span className="text-sm">{format(new Date(record.check_in_time), 'HH:mm')}</span></div>
                      {record.check_out_time ? (<div className="flex items-center gap-2"><LogOut className="w-4 h-4 text-blue-500" /><span className="text-sm">{format(new Date(record.check_out_time), 'HH:mm')}</span></div>) : null}
                      {getStatusBadge(record.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
