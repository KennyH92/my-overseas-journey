import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, MapPin, Users, AlertTriangle, ClipboardList, Calendar,
  BarChart3, Plus, Eye, Clock, CheckCircle, XCircle, TrendingUp, Building2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";

export default function Dashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'zh' ? zhCN : enUS;

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [reportsRes, guardsRes, sitesRes, alarmsRes, checkpointsRes, plansRes] =
        await Promise.all([
          supabase.from("patrol_reports").select("id, status, start_time").gte("start_time", today.toISOString()),
          supabase.from("guards").select("id, status"),
          supabase.from("sites").select("id, status"),
          supabase.from("alarms").select("id, status, severity"),
          supabase.from("checkpoints").select("id, status"),
          supabase.from("patrol_plans").select("id, status"),
        ]);
      return {
        todayPatrols: (reportsRes.data || []).length,
        completedPatrols: (reportsRes.data || []).filter((r) => r.status === "completed").length,
        activeGuards: (guardsRes.data || []).filter((g) => g.status === "active").length,
        totalGuards: (guardsRes.data || []).length,
        activeSites: (sitesRes.data || []).filter((s) => s.status === "active").length,
        openAlarms: (alarmsRes.data || []).filter((a) => a.status === "open").length,
        highSeverityAlarms: (alarmsRes.data || []).filter((a) => a.status === "open" && a.severity === "high").length,
        totalCheckpoints: (checkpointsRes.data || []).filter((c) => c.status === "active").length,
        activePlans: (plansRes.data || []).filter((p) => p.status === "active").length,
      };
    },
  });

  // Fetch recent patrol reports
  const { data: recentReports, isLoading: reportsLoading } = useQuery({
    queryKey: ["recent-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patrol_reports")
        .select(`id, status, start_time, end_time, guards(name), sites(name)`)
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
        .select(`id, title, severity, status, created_at, guards(name), sites(name)`)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const statCards = [
    {
      title: t('dashboard.todayPatrols'),
      value: stats?.todayPatrols || 0,
      subtitle: `${stats?.completedPatrols || 0} ${t('dashboard.completed')}`,
      icon: Shield, color: "text-blue-500", bgColor: "bg-blue-500/10",
    },
    {
      title: t('dashboard.activeGuards'),
      value: stats?.activeGuards || 0,
      subtitle: t('dashboard.totalPeople', { count: stats?.totalGuards || 0 }),
      icon: Users, color: "text-green-500", bgColor: "bg-green-500/10",
    },
    {
      title: t('dashboard.activeSites'),
      value: stats?.activeSites || 0,
      subtitle: `${stats?.totalCheckpoints || 0} ${t('dashboard.checkpoints')}`,
      icon: MapPin, color: "text-purple-500", bgColor: "bg-purple-500/10",
    },
    {
      title: t('dashboard.pendingAlarms'),
      value: stats?.openAlarms || 0,
      subtitle: stats?.highSeverityAlarms ? t('dashboard.highPriority', { count: stats.highSeverityAlarms }) : t('dashboard.noUrgentAlarms'),
      icon: AlertTriangle,
      color: stats?.highSeverityAlarms ? "text-destructive" : "text-orange-500",
      bgColor: stats?.highSeverityAlarms ? "bg-destructive/10" : "bg-orange-500/10",
    },
  ];

  const quickActions = [
    { title: t('dashboard.patrolReports'), icon: ClipboardList, path: "/basic/report" },
    { title: t('dashboard.patrolHistory'), icon: Clock, path: "/basic/history" },
    { title: t('dashboard.statisticsCharts'), icon: BarChart3, path: "/basic/charts" },
    { title: t('dashboard.patrolCalendar'), icon: Calendar, path: "/basic/calendar" },
    { title: t('dashboard.patrolPlans'), icon: TrendingUp, path: "/setup/plan" },
    { title: t('dashboard.siteManagement'), icon: Building2, path: "/sites" },
  ];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive"; labelKey: string }> = {
      completed: { variant: "default", labelKey: "dashboard.statusCompleted" },
      in_progress: { variant: "secondary", labelKey: "dashboard.statusInProgress" },
      missed: { variant: "destructive", labelKey: "dashboard.statusMissed" },
      open: { variant: "destructive", labelKey: "dashboard.statusPending" },
      resolved: { variant: "default", labelKey: "dashboard.statusResolved" },
    };
    const { variant, labelKey } = config[status] || { variant: "secondary" as const, labelKey: status };
    return <Badge variant={variant}>{t(labelKey)}</Badge>;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = { high: "text-destructive", medium: "text-orange-500", low: "text-yellow-500" };
    return colors[severity] || "text-muted-foreground";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('dashboard.welcome')} · {format(new Date(), "yyyy-MM-dd EEEE", { locale: dateLocale })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (<Card key={i} className="p-6"><Skeleton className="h-20 w-full" /></Card>))
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

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">{t('dashboard.quickActions')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {quickActions.map((action) => (
              <Button key={action.path} variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50" onClick={() => navigate(action.path)}>
                <action.icon className="h-5 w-5 text-primary" />
                <span className="text-sm">{action.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">{t('dashboard.recentPatrols')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/basic/history")}>
              <Eye className="h-4 w-4 mr-1" />{t('common.viewAll')}
            </Button>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full" />))}</div>
            ) : recentReports && recentReports.length > 0 ? (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <div key={report.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors" onClick={() => navigate(`/patrol/detail/${report.id}`)}>
                    <div className="flex-shrink-0">
                      {report.status === "completed" ? <CheckCircle className="h-5 w-5 text-green-500" /> : report.status === "missed" ? <XCircle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-yellow-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{report.guards?.name || t('dashboard.unknownGuard')}</p>
                        {getStatusBadge(report.status || "in_progress")}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {report.sites?.name || t('dashboard.unknownSite')} · {formatDistanceToNow(new Date(report.start_time), { addSuffix: true, locale: dateLocale })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>{t('dashboard.noPatrolRecords')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">{t('dashboard.recentAlarms')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/basic/report")}>
              <Eye className="h-4 w-4 mr-1" />{t('common.viewAll')}
            </Button>
          </CardHeader>
          <CardContent>
            {alarmsLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full" />))}</div>
            ) : recentAlarms && recentAlarms.length > 0 ? (
              <div className="space-y-3">
                {recentAlarms.map((alarm) => (
                  <div key={alarm.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex-shrink-0"><AlertTriangle className={`h-5 w-5 ${getSeverityColor(alarm.severity || "medium")}`} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{alarm.title}</p>
                        {getStatusBadge(alarm.status || "open")}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {alarm.sites?.name || t('dashboard.unknownLocation')} · {formatDistanceToNow(new Date(alarm.created_at), { addSuffix: true, locale: dateLocale })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" /><p>{t('dashboard.noAlarms')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.activePlans')}</p>
              <p className="text-xl font-bold">{stats?.activePlans || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.todayCompletionRate')}</p>
              <p className="text-xl font-bold">{stats?.todayPatrols ? Math.round((stats.completedPatrols / stats.todayPatrols) * 100) : 0}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><MapPin className="h-5 w-5 text-purple-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.patrolCoverage')}</p>
              <p className="text-xl font-bold">{stats?.totalCheckpoints || 0} {t('dashboard.points')}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
