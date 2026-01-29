import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, UserPlus, Shield, X, Plus, Eye, Trash2, Settings, ClipboardList } from 'lucide-react';
import { UserImportDialog } from '@/components/user/UserImportDialog';
import { GuardRegistrationDialog } from '@/components/user/GuardRegistrationDialog';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, string> = {
  admin: '管理员',
  manager: '经理',
  supervisor: '主管',
  guard: '保安',
};

const roleBadgeVariant: Record<AppRole, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  admin: 'destructive',
  manager: 'default',
  supervisor: 'secondary',
  guard: 'outline',
};

const roleInfo = {
  admin: {
    label: '管理员',
    description: '系统最高权限，可管理所有功能和用户',
    permissions: ['用户管理', '角色分配', '系统设置', '数据管理', '报告查看'],
    color: 'destructive' as const,
  },
  manager: {
    label: '经理',
    description: '可管理站点、保安和巡更计划',
    permissions: ['站点管理', '保安管理', '计划制定', '报告查看', '告警处理'],
    color: 'default' as const,
  },
  supervisor: {
    label: '主管',
    description: '可监督巡更执行和处理告警',
    permissions: ['巡更监控', '告警处理', '报告查看', '通知发送'],
    color: 'secondary' as const,
  },
  guard: {
    label: '保安',
    description: '执行巡更任务，记录巡更情况',
    permissions: ['执行巡更', '提交报告', '发起告警', '查看任务'],
    color: 'outline' as const,
  },
};

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('guard');
  
  // 注册新用户表单
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('guard');
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      if (rolesError) throw rolesError;

      return profiles?.map(profile => ({
        ...profile,
        roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) || [],
      }));
    },
  });

  const { data: roleCounts } = useQuery({
    queryKey: ['role-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role');
      if (error) throw error;
      
      const counts: Record<string, number> = { admin: 0, manager: 0, supervisor: 0, guard: 0 };
      data?.forEach(item => {
        if (item.role in counts) {
          counts[item.role]++;
        }
      });
      return counts;
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-counts'] });
      toast({ title: '角色分配成功' });
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: '角色分配失败', variant: 'destructive' });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-counts'] });
      toast({ title: '角色已移除' });
    },
    onError: () => {
      toast({ title: '移除角色失败', variant: 'destructive' });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // First delete user roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (rolesError) throw rolesError;

      // Then delete profile (user in auth.users cannot be deleted from client)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-counts'] });
      toast({ title: '用户已删除' });
    },
    onError: (error: Error) => {
      toast({ title: '删除用户失败', description: error.message, variant: 'destructive' });
    },
  });

  const registerUserMutation = useMutation({
    mutationFn: async ({ email, password, fullName, role }: { 
      email: string; 
      password: string; 
      fullName: string;
      role: AppRole;
    }) => {
      // 注册新用户
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName }
        }
      });
      if (error) throw error;
      if (!data.user) throw new Error('注册失败');

      // 分配角色
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role });
      if (roleError) throw roleError;

      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-counts'] });
      toast({ title: '用户注册成功' });
      setRegisterDialogOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserRole('guard');
    },
    onError: (error: Error) => {
      toast({ 
        title: '用户注册失败', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const filteredUsers = users?.filter(user =>
    user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    user.phone?.includes(search) ||
    user.employee_id?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssignRole = () => {
    if (selectedUserId && selectedRole) {
      assignRoleMutation.mutate({ userId: selectedUserId, role: selectedRole });
    }
  };

  const handleRemoveRole = (userId: string, role: AppRole) => {
    removeRoleMutation.mutate({ userId, role });
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  const handleRegisterUser = () => {
    if (!newUserEmail || !newUserPassword || !newUserFullName) {
      toast({ title: '请填写所有必填字段', variant: 'destructive' });
      return;
    }
    if (newUserPassword.length < 6) {
      toast({ title: '密码至少需要6个字符', variant: 'destructive' });
      return;
    }
    registerUserMutation.mutate({ 
      email: newUserEmail, 
      password: newUserPassword, 
      fullName: newUserFullName,
      role: newUserRole 
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">用户与权限</h1>
        <p className="text-muted-foreground">管理系统用户和角色权限分配</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            用户管理
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            角色权限
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  用户列表
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="搜索用户..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <GuardRegistrationDialog />
                  <UserImportDialog />
                  <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        注册新用户
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>注册新用户</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>姓名 *</Label>
                          <Input
                            placeholder="请输入用户姓名"
                            value={newUserFullName}
                            onChange={(e) => setNewUserFullName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>邮箱 *</Label>
                          <Input
                            type="email"
                            placeholder="请输入邮箱地址"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>密码 *</Label>
                          <Input
                            type="password"
                            placeholder="至少6个字符"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>初始角色</Label>
                          <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">管理员</SelectItem>
                              <SelectItem value="manager">经理</SelectItem>
                              <SelectItem value="supervisor">主管</SelectItem>
                              <SelectItem value="guard">保安</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={handleRegisterUser} 
                          className="w-full"
                          disabled={registerUserMutation.isPending}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {registerUserMutation.isPending ? '注册中...' : '确认注册'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>工号</TableHead>
                      <TableHead>用户名</TableHead>
                      <TableHead>电话</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          暂无用户数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers?.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-mono text-primary">
                            {user.employee_id || '-'}
                          </TableCell>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.phone || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {user.roles.length > 0 ? (
                                user.roles.map((role) => (
                                  <Badge 
                                    key={role} 
                                    variant={roleBadgeVariant[role as AppRole]}
                                    className="flex items-center gap-1"
                                  >
                                    {roleLabels[role as AppRole]}
                                    <button
                                      onClick={() => handleRemoveRole(user.id, role as AppRole)}
                                      className="ml-1 hover:text-destructive-foreground"
                                      title="移除此角色"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">未分配</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at!).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/data/user/${user.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                详情
                              </Button>
                              <Dialog open={dialogOpen && selectedUserId === user.id} onOpenChange={(open) => {
                                setDialogOpen(open);
                                if (open) setSelectedUserId(user.id);
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Shield className="h-4 w-4 mr-1" />
                                    分配角色
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>分配角色 - {user.full_name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                      <Label>选择角色</Label>
                                      <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="admin">管理员</SelectItem>
                                          <SelectItem value="manager">经理</SelectItem>
                                          <SelectItem value="supervisor">主管</SelectItem>
                                          <SelectItem value="guard">保安</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button 
                                      onClick={handleAssignRole} 
                                      className="w-full"
                                      disabled={assignRoleMutation.isPending}
                                    >
                                      <UserPlus className="h-4 w-4 mr-2" />
                                      {assignRoleMutation.isPending ? '分配中...' : '确认分配'}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>确认删除用户？</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      此操作将删除用户 "{user.full_name}" 的资料和角色信息。此操作无法撤销。
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      确认删除
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(roleInfo).map(([key, info]) => (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{info.label}</span>
                    <Badge variant={info.color}>
                      {roleCounts?.[key] || 0} 人
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm">{info.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                权限矩阵
              </CardTitle>
              <CardDescription>各角色的权限配置详情</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>角色</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" /> 用户管理
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <Settings className="h-4 w-4" /> 系统设置
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <ClipboardList className="h-4 w-4" /> 计划管理
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" /> 报告查看
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">管理员</TableCell>
                    <TableCell><Badge variant="default">完全</Badge></TableCell>
                    <TableCell><Badge variant="default">完全</Badge></TableCell>
                    <TableCell><Badge variant="default">完全</Badge></TableCell>
                    <TableCell><Badge variant="default">完全</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">经理</TableCell>
                    <TableCell><Badge variant="secondary">部分</Badge></TableCell>
                    <TableCell><Badge variant="outline">无</Badge></TableCell>
                    <TableCell><Badge variant="default">完全</Badge></TableCell>
                    <TableCell><Badge variant="default">完全</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">主管</TableCell>
                    <TableCell><Badge variant="outline">无</Badge></TableCell>
                    <TableCell><Badge variant="outline">无</Badge></TableCell>
                    <TableCell><Badge variant="secondary">查看</Badge></TableCell>
                    <TableCell><Badge variant="default">完全</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">保安</TableCell>
                    <TableCell><Badge variant="outline">无</Badge></TableCell>
                    <TableCell><Badge variant="outline">无</Badge></TableCell>
                    <TableCell><Badge variant="secondary">查看</Badge></TableCell>
                    <TableCell><Badge variant="secondary">本人</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}