import { Card } from '@/components/ui/card';
import { Shield, MapPin, Users, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { title: '今日巡更', value: '156', icon: Shield, color: 'text-blue-500' },
    { title: '在线保安', value: '24', icon: Users, color: 'text-green-500' },
    { title: '巡更点位', value: '89', icon: MapPin, color: 'text-purple-500' },
    { title: '告警数量', value: '3', icon: AlertTriangle, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">仪表板</h1>
        <p className="text-sm text-muted-foreground mt-1">欢迎使用国管巡更系统</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activities */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">最近活动</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <Shield className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">新巡更报告已提交</p>
              <p className="text-xs text-muted-foreground">保安张三 - 2分钟前</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">发现异常情况</p>
              <p className="text-xs text-muted-foreground">东区B栋 - 15分钟前</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <Users className="h-5 w-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">保安李四上线</p>
              <p className="text-xs text-muted-foreground">西区A栋 - 30分钟前</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
