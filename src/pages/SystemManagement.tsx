import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings, Bell, Shield, Clock, Database } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function SystemManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">系统管理</h1>
        <p className="text-muted-foreground">配置系统参数和设置</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              通知设置
            </CardTitle>
            <CardDescription>配置系统通知和提醒</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="patrol-alert">巡更超时提醒</Label>
              <Switch id="patrol-alert" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="alarm-notify">告警即时通知</Label>
              <Switch id="alarm-notify" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="report-notify">报告生成通知</Label>
              <Switch id="report-notify" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              时间设置
            </CardTitle>
            <CardDescription>配置系统时间参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timeout">巡更超时时间 (分钟)</Label>
              <Input id="timeout" type="number" defaultValue={30} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval">最小巡更间隔 (分钟)</Label>
              <Input id="interval" type="number" defaultValue={5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              安全设置
            </CardTitle>
            <CardDescription>配置系统安全参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="two-factor">双重认证</Label>
              <Switch id="two-factor" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="session-timeout">会话自动超时</Label>
              <Switch id="session-timeout" defaultChecked />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-duration">会话时长 (小时)</Label>
              <Input id="session-duration" type="number" defaultValue={8} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              数据设置
            </CardTitle>
            <CardDescription>配置数据存储和备份</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-backup">自动备份</Label>
              <Switch id="auto-backup" defaultChecked />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retention">数据保留天数</Label>
              <Input id="retention" type="number" defaultValue={365} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          保存设置
        </Button>
      </div>
    </div>
  );
}
