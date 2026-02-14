import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, User, Shield, Phone, Calendar, Clock, MapPin, FileText, AlertTriangle, Pencil, Save, X, Mail, CreditCard, Globe } from 'lucide-react';
import { maskIdNumber, maskPhone } from '@/lib/data-masking';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, string> = {
  admin: '管理员',
  manager: '经理',
  guard: '保安',
};

const roleBadgeVariant: Record<AppRole, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  admin: 'destructive',
  manager: 'default',
  guard: 'outline',
};

const allRoles: AppRole[] = ['admin', 'manager', 'guard'];

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Edit states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editIdNumber, setEditIdNumber] = useState('');
  const [editIsForeignEmployee, setEditIsForeignEmployee] = useState(false);
  const [editPassportExpiry, setEditPassportExpiry] = useState('');
  const [editWorkPermitExpiry, setEditWorkPermitExpiry] = useState('');
  const [editRoles, setEditRoles] = useState<AppRole[]>([]);

  // Check if current user is an admin or manager
  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin-or-manager', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .in('role', ['admin', 'manager']);
      return (data?.length || 0) > 0;
    },
    enabled: !!currentUser?.id,
  });

  // Check if current user is viewing their own profile
  const isOwnProfile = currentUser?.id === id;
  
  // Can edit if admin/manager OR viewing own profile
  const canEdit = isAdmin || isOwnProfile;
  
  // Can edit roles only if admin
  const canEditRoles = isAdmin;

  // Fetch user profile with roles
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user-detail', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (profileError) throw profileError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', id);
      if (rolesError) throw rolesError;

      // Check if user is linked to a guard
      const { data: guard } = await supabase
        .from('guards')
        .select('*, companies(name)')
        .eq('user_id', id)
        .maybeSingle();

      return {
        ...profile,
        roles: roles?.map(r => r.role) || [],
        guard,
      };
    },
    enabled: !!id,
  });

  // Update edit states when user data changes
  useEffect(() => {
    if (user) {
      setEditFullName(user.full_name || '');
      setEditPhone(user.phone || '');
      setEditEmail(user.email || '');
      setEditBirthDate(user.birth_date || '');
      setEditIdNumber(user.id_number || '');
      setEditIsForeignEmployee(user.is_foreign_employee || false);
      setEditPassportExpiry(user.passport_expiry_date || '');
      setEditWorkPermitExpiry(user.work_permit_expiry_date || '');
      setEditRoles(user.roles as AppRole[]);
    }
  }, [user]);

  // Fetch patrol reports if user is a guard
  const { data: patrolReports } = useQuery({
    queryKey: ['user-patrol-reports', id],
    queryFn: async () => {
      if (!user?.guard?.id) return [];
      
      const { data, error } = await supabase
        .from('patrol_reports')
        .select('*, sites(name)')
        .eq('guard_id', user.guard.id)
        .order('start_time', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.guard?.id,
  });

  // Fetch alarms created by user
  const { data: alarms } = useQuery({
    queryKey: ['user-alarms', id],
    queryFn: async () => {
      if (!user?.guard?.id) return [];
      
      const { data, error } = await supabase
        .from('alarms')
        .select('*, sites(name)')
        .eq('guard_id', user.guard.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.guard?.id,
  });

  // Fetch attendance records
  const { data: attendanceRecords } = useQuery({
    queryKey: ['user-attendance', id],
    queryFn: async () => {
      if (!user?.guard?.id) return [];
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*, projects(name)')
        .eq('guard_id', user.guard.id)
        .order('date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.guard?.id,
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ 
      fullName, 
      phone, 
      email,
      birthDate,
      idNumber,
      isForeignEmployee,
      passportExpiry,
      workPermitExpiry,
      roles, 
      updateRoles 
    }: { 
      fullName: string; 
      phone: string; 
      email: string;
      birthDate: string;
      idNumber: string;
      isForeignEmployee: boolean;
      passportExpiry: string;
      workPermitExpiry: string;
      roles: AppRole[]; 
      updateRoles: boolean;
    }) => {
      if (!id) throw new Error('用户ID不存在');

      // Validate input
      const trimmedName = fullName.trim();
      const trimmedPhone = phone.trim();
      const trimmedEmail = email.trim();
      const trimmedIdNumber = idNumber.trim();
      
      if (!trimmedName) {
        throw new Error('姓名不能为空');
      }
      if (trimmedName.length > 100) {
        throw new Error('姓名不能超过100个字符');
      }
      if (trimmedPhone && trimmedPhone.length > 20) {
        throw new Error('电话号码不能超过20个字符');
      }
      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        throw new Error('邮箱格式不正确');
      }
      if (trimmedIdNumber && trimmedIdNumber.length > 50) {
        throw new Error('证件号码不能超过50个字符');
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: trimmedName, 
          phone: trimmedPhone || null,
          email: trimmedEmail || null,
          birth_date: birthDate || null,
          id_number: trimmedIdNumber || null,
          is_foreign_employee: isForeignEmployee,
          passport_expiry_date: isForeignEmployee && passportExpiry ? passportExpiry : null,
          work_permit_expiry_date: isForeignEmployee && workPermitExpiry ? workPermitExpiry : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (profileError) throw profileError;

      // Only update roles if user has permission (admin/manager)
      if (updateRoles) {
        // Get current roles
        const { data: currentRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', id);
        if (rolesError) throw rolesError;

        const currentRoleList = currentRoles?.map(r => r.role) || [];
        
        // Roles to add
        const rolesToAdd = roles.filter(r => !currentRoleList.includes(r));
        // Roles to remove
        const rolesToRemove = currentRoleList.filter(r => !roles.includes(r as AppRole));

        // Add new roles
        if (rolesToAdd.length > 0) {
          const { error: addError } = await supabase
            .from('user_roles')
            .insert(rolesToAdd.map(role => ({ user_id: id, role })));
          if (addError) throw addError;
        }

        // Remove old roles
        if (rolesToRemove.length > 0) {
          const { error: removeError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', id)
            .in('role', rolesToRemove);
          if (removeError) throw removeError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-counts'] });
      toast({ title: isOwnProfile ? '个人资料更新成功' : '用户信息更新成功' });
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: '更新失败', description: error.message, variant: 'destructive' });
    },
  });

  const handleSaveEdit = () => {
    updateUserMutation.mutate({
      fullName: editFullName,
      phone: editPhone,
      email: editEmail,
      birthDate: editBirthDate,
      idNumber: editIdNumber,
      isForeignEmployee: editIsForeignEmployee,
      passportExpiry: editPassportExpiry,
      workPermitExpiry: editWorkPermitExpiry,
      roles: editRoles,
      updateRoles: canEditRoles || false,
    });
  };

  const handleRoleToggle = (role: AppRole) => {
    setEditRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleOpenEditDialog = () => {
    if (user) {
      setEditFullName(user.full_name || '');
      setEditPhone(user.phone || '');
      setEditEmail(user.email || '');
      setEditBirthDate(user.birth_date || '');
      setEditIdNumber(user.id_number || '');
      setEditIsForeignEmployee(user.is_foreign_employee || false);
      setEditPassportExpiry(user.passport_expiry_date || '');
      setEditWorkPermitExpiry(user.work_permit_expiry_date || '');
      setEditRoles(user.roles as AppRole[]);
    }
    setEditDialogOpen(true);
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-muted-foreground">用户不存在</div>
        <Button variant="outline" onClick={() => navigate('/data/user')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回用户列表
        </Button>
      </div>
    );
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm', { locale: zhCN });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'yyyy-MM-dd', { locale: zhCN });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/data/user')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">用户详情</h1>
            <p className="text-muted-foreground">查看用户完整信息和操作记录</p>
          </div>
        </div>
        {canEdit && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenEditDialog}>
                <Pencil className="h-4 w-4 mr-2" />
                {isOwnProfile ? '编辑个人资料' : '编辑用户'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isOwnProfile ? '编辑个人资料' : '编辑用户信息'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">姓名 *</Label>
                  <Input
                    id="fullName"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="请输入姓名"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">出生日期</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idNumber">身份证号/护照号码</Label>
                  <Input
                    id="idNumber"
                    value={editIdNumber}
                    onChange={(e) => setEditIdNumber(e.target.value)}
                    placeholder="请输入证件号码"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">手机号码</Label>
                  <Input
                    id="phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="请输入手机号码"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="请输入邮箱地址"
                    maxLength={255}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label htmlFor="isForeign" className="cursor-pointer">外籍员工</Label>
                  <Switch
                    id="isForeign"
                    checked={editIsForeignEmployee}
                    onCheckedChange={setEditIsForeignEmployee}
                  />
                </div>

                {editIsForeignEmployee && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label htmlFor="passportExpiry">护照截止日期</Label>
                      <Input
                        id="passportExpiry"
                        type="date"
                        value={editPassportExpiry}
                        onChange={(e) => setEditPassportExpiry(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workPermitExpiry">准证截止日期</Label>
                      <Input
                        id="workPermitExpiry"
                        type="date"
                        value={editWorkPermitExpiry}
                        onChange={(e) => setEditWorkPermitExpiry(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {canEditRoles && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label>角色分配</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {allRoles.map((role) => (
                          <div key={role} className="flex items-center space-x-2">
                            <Checkbox
                              id={`role-${role}`}
                              checked={editRoles.includes(role)}
                              onCheckedChange={() => handleRoleToggle(role)}
                            />
                            <label
                              htmlFor={`role-${role}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              <Badge variant={roleBadgeVariant[role]} className="ml-1">
                                {roleLabels[role]}
                              </Badge>
                            </label>
                          </div>
                        ))}
                      </div>
                      {editRoles.length === 0 && (
                        <p className="text-sm text-muted-foreground">请至少选择一个角色</p>
                      )}
                    </div>
                  </>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditDialogOpen(false)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    取消
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSaveEdit}
                    disabled={updateUserMutation.isPending || !editFullName.trim()}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateUserMutation.isPending ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* User Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-primary" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{user.full_name}</h3>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {user.roles.length > 0 ? (
                    user.roles.map((role) => (
                      <Badge key={role} variant={roleBadgeVariant[role as AppRole]}>
                        {roleLabels[role as AppRole]}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">未分配角色</span>
                  )}
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">出生日期:</span>
                <span>{user.birth_date ? formatDate(user.birth_date) : '未设置'}</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">证件号码:</span>
                <span>{isAdmin ? (user.id_number || '未设置') : maskIdNumber(user.id_number)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">手机号码:</span>
                <span>{isAdmin ? (user.phone || '未设置') : maskPhone(user.phone)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">邮箱:</span>
                <span>{user.email || '未设置'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">注册时间:</span>
                <span>{formatDateTime(user.created_at)}</span>
              </div>
            </div>

            {user.is_foreign_employee && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">外籍员工信息</span>
                  </div>
                  <div className="grid gap-3 pl-6">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">护照截止日期:</span>
                      <span>{user.passport_expiry_date ? formatDate(user.passport_expiry_date) : '未设置'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">准证截止日期:</span>
                      <span>{user.work_permit_expiry_date ? formatDate(user.work_permit_expiry_date) : '未设置'}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Guard Info (if linked) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              保安信息
            </CardTitle>
            <CardDescription>
              {user.guard ? '已关联保安账号' : '未关联保安账号'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.guard ? (
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">工号:</span>
                  <span>{user.guard.employee_id || '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">所属公司:</span>
                  <span>{user.guard.companies?.name || '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">状态:</span>
                  <Badge variant={user.guard.status === 'active' ? 'default' : 'secondary'}>
                    {user.guard.status === 'active' ? '在职' : '离职'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">联系电话:</span>
                  <span>{user.guard.phone || '-'}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                此用户未关联保安账号
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Records */}
      {user.guard && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Patrol Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                巡更记录
              </CardTitle>
              <CardDescription>最近10条巡更记录</CardDescription>
            </CardHeader>
            <CardContent>
              {patrolReports && patrolReports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>站点</TableHead>
                      <TableHead>开始时间</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patrolReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{report.sites?.name || '-'}</TableCell>
                        <TableCell>{formatDateTime(report.start_time)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            report.status === 'completed' ? 'default' : 
                            report.status === 'in_progress' ? 'secondary' : 'outline'
                          }>
                            {report.status === 'completed' ? '已完成' : 
                             report.status === 'in_progress' ? '进行中' : report.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  暂无巡更记录
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                考勤记录
              </CardTitle>
              <CardDescription>最近10条考勤记录</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceRecords && attendanceRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日期</TableHead>
                      <TableHead>项目</TableHead>
                      <TableHead>班次</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell>{record.projects?.name || '-'}</TableCell>
                        <TableCell>
                          {record.shift_type === 'morning' ? '早班' : 
                           record.shift_type === 'evening' ? '晚班' : record.shift_type}
                        </TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                            {record.status === 'present' ? '出勤' : 
                             record.status === 'absent' ? '缺勤' : 
                             record.status === 'late' ? '迟到' : record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  暂无考勤记录
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alarms */}
      {user.guard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              告警记录
            </CardTitle>
            <CardDescription>最近10条告警记录</CardDescription>
          </CardHeader>
          <CardContent>
            {alarms && alarms.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>站点</TableHead>
                    <TableHead>严重程度</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alarms.map((alarm) => (
                    <TableRow key={alarm.id}>
                      <TableCell className="font-medium">{alarm.title}</TableCell>
                      <TableCell>{alarm.type}</TableCell>
                      <TableCell>{alarm.sites?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          alarm.severity === 'high' ? 'destructive' : 
                          alarm.severity === 'medium' ? 'default' : 'secondary'
                        }>
                          {alarm.severity === 'high' ? '高' : 
                           alarm.severity === 'medium' ? '中' : '低'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          alarm.status === 'open' ? 'destructive' : 
                          alarm.status === 'resolved' ? 'default' : 'secondary'
                        }>
                          {alarm.status === 'open' ? '待处理' : 
                           alarm.status === 'resolved' ? '已解决' : alarm.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(alarm.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无告警记录
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
