import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Users, UserPlus, Shield, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

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
    user.phone?.includes(search)
  );

  const handleAssignRole = () => {
    if (selectedUserId && selectedRole) {
      assignRoleMutation.mutate({ userId: selectedUserId, role: selectedRole });
    }
  };

  const handleRemoveRole = (userId: string, role: AppRole) => {
    removeRoleMutation.mutate({ userId, role });
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
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="text-muted-foreground">管理系统用户和角色分配</p>
      </div>

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
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      暂无用户数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
