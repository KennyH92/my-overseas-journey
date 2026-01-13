import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, User, Shield, Phone, Calendar, Clock, MapPin, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
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

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/data/user')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">用户详情</h1>
          <p className="text-muted-foreground">查看用户完整信息和操作记录</p>
        </div>
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
                <div className="flex gap-1 mt-1">
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
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">电话:</span>
                <span>{user.phone || '未设置'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">注册时间:</span>
                <span>{formatDateTime(user.created_at)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">最后更新:</span>
                <span>{formatDateTime(user.updated_at)}</span>
              </div>
            </div>
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
