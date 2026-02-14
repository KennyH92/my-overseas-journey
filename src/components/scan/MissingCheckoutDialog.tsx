import { useState } from 'react';
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

export default function MissingCheckoutDialog({
  open,
  siteName,
  recordId,
  onConfirm,
  onCancel,
}: MissingCheckoutDialogProps) {
  // Default to yesterday 20:00
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultTime = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}T20:00`;

  const [fixTime, setFixTime] = useState(defaultTime);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(recordId, new Date(fixTime).toISOString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            上个班次未结束
          </DialogTitle>
          <DialogDescription>
            系统检测到您在 <span className="font-semibold text-foreground">{siteName}</span> 尚未签退。请确认上个班次的下班时间。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fix-time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              补签退时间
            </Label>
            <Input
              id="fix-time"
              type="datetime-local"
              value={fixTime}
              onChange={(e) => setFixTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? '处理中...' : '确认补签并开始今日工作'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
