import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Clock } from 'lucide-react';

interface MissingCheckoutDialogProps {
  open: boolean;
  siteName: string;
  recordId: string;
  onConfirm: (recordId: string, fixOutTime: string) => Promise<void>;
  onCancel: () => void;
}

export default function MissingCheckoutDialog({ open, siteName, recordId, onConfirm, onCancel }: MissingCheckoutDialogProps) {
  const { t } = useTranslation();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultTime = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}T20:00`;

  const [fixTime, setFixTime] = useState(defaultTime);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(recordId, new Date(fixTime).toISOString()); } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {t('missingCheckout.title')}
          </DialogTitle>
          <DialogDescription>
            {t('missingCheckout.description', { siteName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fix-time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t('missingCheckout.fixTime')}
            </Label>
            <Input id="fix-time" type="datetime-local" value={fixTime} onChange={(e) => setFixTime(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>{t('common.cancel')}</Button>
          <Button onClick={handleConfirm} disabled={loading}>{loading ? t('common.loading') : t('missingCheckout.confirmBtn')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
