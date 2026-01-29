import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Copy, CheckCircle2 } from 'lucide-react';

const DEFAULT_PASSWORD = '1234abcd';

interface GuardRegistrationDialogProps {
  onSuccess?: () => void;
}

export function GuardRegistrationDialog({ onSuccess }: GuardRegistrationDialogProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [createdStaffId, setCreatedStaffId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const registerGuardMutation = useMutation({
    mutationFn: async ({ fullName, phone, email }: { 
      fullName: string; 
      phone?: string;
      email?: string;
    }) => {
      // First, generate the next staff ID
      const { data: staffIdData, error: staffIdError } = await supabase
        .rpc('generate_next_staff_id');
      
      if (staffIdError) throw staffIdError;
      
      const staffId = staffIdData as string;
      
      // Use the staff ID as email for auth (with @guard.local domain)
      const authEmail = `${staffId.toLowerCase()}@guard.local`;
      
      // Register new user with default password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: authEmail,
        password: DEFAULT_PASSWORD,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { 
            full_name: fullName,
            employee_id: staffId
          }
        }
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('注册失败');

      // Setup the guard profile with generated staff ID
      const { error: profileError } = await supabase
        .rpc('setup_guard_profile', {
          _user_id: authData.user.id,
          _full_name: fullName,
          _phone: phone || null,
          _email: email || null
        });
      
      if (profileError) throw profileError;

      // Assign guard role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: authData.user.id, role: 'guard' });
      
      if (roleError) throw roleError;

      return { staffId, user: authData.user };
    },
    onSuccess: (data) => {
      setCreatedStaffId(data.staffId);
      setSuccessDialogOpen(true);
      setDialogOpen(false);
      
      // Reset form
      setFullName('');
      setPhone('');
      setEmail('');
      
      // Refresh user lists
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-counts'] });
      
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: '保安账号注册失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleRegister = () => {
    if (!fullName.trim()) {
      toast({
        title: '请填写姓名',
        variant: 'destructive',
      });
      return;
    }
    
    registerGuardMutation.mutate({ 
      fullName: fullName.trim(), 
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
  };

  const handleCopyCredentials = () => {
    const credentials = `工号: ${createdStaffId}\n初始密码: ${DEFAULT_PASSWORD}`;
    navigator.clipboard.writeText(credentials);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: '已复制到剪贴板',
    });
  };

  const handleCloseSuccess = () => {
    setSuccessDialogOpen(false);
    setCreatedStaffId('');
    setCopied(false);
  };

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            注册保安账号
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>注册保安账号</DialogTitle>
            <DialogDescription>
              系统将自动生成工号（TSSB格式）作为登录账号，初始密码为 {DEFAULT_PASSWORD}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>姓名 <span className="text-destructive">*</span></Label>
              <Input
                placeholder="请输入保安姓名"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>电话</Label>
              <Input
                placeholder="请输入电话号码（选填）"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input
                type="email"
                placeholder="请输入邮箱地址（选填）"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p className="font-medium mb-1">注册后：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>工号将自动生成（TSSB00001 格式）</li>
                <li>初始密码为：{DEFAULT_PASSWORD}</li>
                <li>首次登录需修改密码</li>
              </ul>
            </div>
            <Button 
              onClick={handleRegister} 
              className="w-full"
              disabled={registerGuardMutation.isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {registerGuardMutation.isPending ? '注册中...' : '确认注册'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">账号创建成功！</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <p className="text-lg font-semibold text-foreground">
                  工号：<span className="text-primary">{createdStaffId}</span>
                </p>
                <p className="text-lg font-semibold text-foreground">
                  初始密码：<span className="text-primary">{DEFAULT_PASSWORD}</span>
                </p>
              </div>
              <p className="mt-4 text-sm">
                请将此信息提供给保安，首次登录时需修改密码。
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <Button
              variant="outline"
              onClick={handleCopyCredentials}
              className="flex items-center gap-2"
            >
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? '已复制' : '复制凭证'}
            </Button>
            <AlertDialogAction onClick={handleCloseSuccess}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
