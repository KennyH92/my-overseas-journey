import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  MapPin,
  Users,
  AlertTriangle,
  ClipboardList,
  Calendar,
  BarChart3,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Building2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function Dashboard() {
  const navigate = useNavigate();

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [reportsRes, guardsRes, sitesRes, alarmsRes, checkpointsRes, plansRes] =
        await Promise.all([
          supabase
            .from("patrol_reports")
            .select("id, status, start_time")
            .gte("start_time", today.toISOString()),
          supabase.from("guards").select("id, status"),
          supabase.from("sites").select("id, status"),
          supabase.from("alarms").select("id, status, severity"),
          supabase.from("checkpoints").select("id, status"),
          supabase.from("patrol_plans").select("id, status"),
        ]);

      const todayReports = reportsRes.data || [];
      const guards = guardsRes.data || [];
      const sites = sitesRes.data || [];
      const alarms = alarmsRes.data || [];
      const checkpoints = checkpointsRes.data || [];
      const plans = plansRes.data || [];

      return {
        todayPatrols: todayReports.length,
        completedPatrols: todayReports.filter((r) => r.status === "completed").length,
        activeGuards: guards.filter((g) => g.status === "active").length,
        totalGuards: guards.length,
        activeSites: sites.filter((s) => s.status === "active").length,
        openAlarms: alarms.filter((a) => a.status === "open").length,
        highSeverityAlarms: alarms.filter((a) => a.status === "open" && a.severity === "high").length,
        totalCheckpoints: checkpoints.filter((c) => c.status === "active").length,
        activePlans: plans.filter((p) => p.status === "active").length,
      };
    },
  });

  // Fetch recent patrol reports
  const { data: recentReports, isLoading: reportsLoading } = useQuery({
    queryKey: ["recent-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patrol_reports")
        .select(
          `
          id, status, start_time, end_time,
          guards(name),
          sites(name)
        `
        )
        .order("start_time", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  // Fetch recent alarms
  const { data: recentAlarms, isLoading: alarmsLoading } = useQuery({
    queryKey: ["recent-alarms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alarms")
        .select(
          `
          id, title, severity, status, created_at,
          guards(name),
          sites(name)
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const statCards = [
    {
      title: "今日巡逻",
      value: stats?.todayPatrols || 0,
      subtitle: `${stats?.completedPatrols || 0} 已完成`,
      icon: Shield,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "活跃保安",
      value: stats?.activeGuards || 0,
      subtitle: `共 ${stats?.totalGuards || 0} 人`,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "活跃站点",
      value: stats?.activeSites || 0,
      subtitle: `${stats?.totalCheckpoints || 0} 个巡检点`,
      icon: MapPin,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "待处理警报",
      value: stats?.openAlarms || 0,
      subtitle: stats?.highSeverityAlarms ? `${stats.highSeverityAlarms} 个高优先级` : "无紧急警报",
      icon: AlertTriangle,
      color: stats?.highSeverityAlarms ? "text-destructive" : "text-orange-500",
      bgColor: stats?.highSeverityAlarms ? "bg-destructive/10" : "bg-orange-500/10",
    },
  ];

  const quickActions = [
    { title: "巡逻报告", icon: ClipboardList, path: "/basic/report" },
    { title: "巡逻历史", icon: Clock, path: "/basic/history" },
    { title: "统计图表", icon: BarChart3, path: "/basic/charts" },
    { title: "巡逻日历", icon: Calendar, path: "/basic/calendar" },
    { title: "巡更计划", icon: TrendingUp, path: "/setup/plan" },
    { title: "站点管理", icon: Building2, path: "/sites" },
  ];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      completed: { variant: "default", label: "已完成" },
      in_progress: { variant: "secondary", label: "进行中" },
      missed: { variant: "destructive", label: "已错过" },
      open: { variant: "destructive", label: "待处理" },
      resolved: { variant: "default", label: "已解决" },
    };
    const { variant, label } = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      high: "text-destructive",
      medium: "text-orange-500",
      low: "text-yellow-500",
    };
    return colors[severity] || "text-muted-foreground";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">仪表板</h1>
          <p className="text-sm text-muted-foreground mt-1">
            欢迎使用国管巡更系统 · {format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-20 w-full" />
              </Card>
            ))
          : statCards.map((stat) => (
              <Card key={stat.title} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </Card>
            ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.path}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50"
                onClick={() => navigate(action.path)}
              >
                <action.icon className="h-5 w-5 text-primary" />
                <span className="text-sm">{action.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Patrol Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">最近巡逻</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/basic/history")}>
              <Eye className="h-4 w-4 mr-1" />
              查看全部
            </Button>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentReports && recentReports.length > 0 ? (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate(`/patrol/detail/${report.id}`)}
                  >
                    <div className="flex-shrink-0">
                      {report.status === "completed" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : report.status === "missed" ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {report.guards?.name || "未知保安"}
                        </p>
                        {getStatusBadge(report.status || "in_progress")}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {report.sites?.name || "未知站点"} ·{" "}
                        {formatDistanceToNow(new Date(report.start_time), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>暂无巡逻记录</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Alarms */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">最近警报</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/basic/report")}>
              <Eye className="h-4 w-4 mr-1" />
              查看全部
            </Button>
          </CardHeader>
          <CardContent>
            {alarmsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentAlarms && recentAlarms.length > 0 ? (
              <div className="space-y-3">
                {recentAlarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <AlertTriangle className={`h-5 w-5 ${getSeverityColor(alarm.severity || "medium")}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{alarm.title}</p>
                        {getStatusBadge(alarm.status || "open")}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {alarm.sites?.name || "未知位置"} ·{" "}
                        {formatDistanceToNow(new Date(alarm.created_at), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                <p>暂无警报，一切正常</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">活跃计划</p>
              <p className="text-xl font-bold">{stats?.activePlans || 0} 个</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">今日完成率</p>
              <p className="text-xl font-bold">
                {stats?.todayPatrols
                  ? Math.round((stats.completedPatrols / stats.todayPatrols) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <MapPin className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">巡检覆盖</p>
              <p className="text-xl font-bold">{stats?.totalCheckpoints || 0} 个点位</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
