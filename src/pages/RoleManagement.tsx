import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Eye, Settings, ClipboardList } from 'lucide-react';

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

export default function RoleManagement() {
  const { data: roleCounts, isLoading } = useQuery({
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">角色权限</h1>
        <p className="text-muted-foreground">查看和管理系统角色及其权限</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(roleInfo).map(([key, info]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{info.label}</span>
                <Badge variant={info.color}>
                  {isLoading ? '...' : roleCounts?.[key] || 0} 人
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
    </div>
  );
}
