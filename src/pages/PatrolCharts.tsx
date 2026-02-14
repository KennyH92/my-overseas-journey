import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ClipboardCheck, AlertTriangle, Users, MapPin } from "lucide-react";

const PatrolCharts = () => {
  const { t, i18n } = useTranslation();

  const { data: stats } = useQuery({
    queryKey: ["patrol-stats"],
    queryFn: async () => {
      const [reportsRes, guardsRes, sitesRes, alarmsRes] = await Promise.all([
        supabase.from("patrol_reports").select("id, status, start_time"),
        supabase.from("guards").select("id, status"),
        supabase.from("sites").select("id, status"),
        supabase.from("alarms").select("id, status, severity"),
      ]);
      return { reports: reportsRes.data || [], guards: guardsRes.data || [], sites: sitesRes.data || [], alarms: alarmsRes.data || [] };
    },
  });

  const statusData = [
    { name: t('patrolCharts.completed'), value: stats?.reports.filter((r) => r.status === "completed").length || 0, color: "hsl(var(--chart-1))" },
    { name: t('patrolCharts.inProgress'), value: stats?.reports.filter((r) => r.status === "in_progress").length || 0, color: "hsl(var(--chart-2))" },
    { name: t('patrolCharts.missed'), value: stats?.reports.filter((r) => r.status === "missed").length || 0, color: "hsl(var(--chart-3))" },
  ];

  const alarmData = [
    { name: t('patrolCharts.high'), value: stats?.alarms.filter((a) => a.severity === "high").length || 0, color: "hsl(var(--destructive))" },
    { name: t('patrolCharts.medium'), value: stats?.alarms.filter((a) => a.severity === "medium").length || 0, color: "hsl(var(--chart-4))" },
    { name: t('patrolCharts.low'), value: stats?.alarms.filter((a) => a.severity === "low").length || 0, color: "hsl(var(--chart-5))" },
  ];

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split("T")[0];
    const count = stats?.reports.filter((r) => r.start_time?.startsWith(dateStr)).length || 0;
    return { date: date.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : i18n.language === 'ms' ? 'ms-MY' : i18n.language === 'ne' ? 'ne-NP' : 'en-US', { month: "short", day: "numeric" }), count };
  });

  const chartConfig = {
    count: { label: t('patrolCharts.patrolCount'), color: "hsl(var(--chart-1))" },
    completed: { label: t('patrolCharts.completed'), color: "hsl(var(--chart-1))" },
    in_progress: { label: t('patrolCharts.inProgress'), color: "hsl(var(--chart-2))" },
    missed: { label: t('patrolCharts.missed'), color: "hsl(var(--chart-3))" },
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('patrolCharts.title')}</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-lg bg-primary/10"><ClipboardCheck className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">{t('patrolCharts.totalPatrols')}</p><p className="text-2xl font-bold">{stats?.reports.length || 0}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-lg bg-green-500/10"><Users className="h-6 w-6 text-green-500" /></div><div><p className="text-sm text-muted-foreground">{t('patrolCharts.activePatrollers')}</p><p className="text-2xl font-bold">{stats?.guards.filter((g) => g.status === "active").length || 0}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-lg bg-blue-500/10"><MapPin className="h-6 w-6 text-blue-500" /></div><div><p className="text-sm text-muted-foreground">{t('patrolCharts.activeSites')}</p><p className="text-2xl font-bold">{stats?.sites.filter((s) => s.status === "active").length || 0}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-lg bg-destructive/10"><AlertTriangle className="h-6 w-6 text-destructive" /></div><div><p className="text-sm text-muted-foreground">{t('patrolCharts.pendingAlarms')}</p><p className="text-2xl font-bold">{stats?.alarms.filter((a) => a.status === "open").length || 0}</p></div></div></CardContent></Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader><CardTitle>{t('patrolCharts.last7DaysTrend')}</CardTitle></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[300px]"><LineChart data={last7Days}><XAxis dataKey="date" /><YAxis /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-1))" }} /></LineChart></ChartContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>{t('patrolCharts.statusDistribution')}</CardTitle></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[300px]"><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>{statusData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}</Pie><ChartTooltip content={<ChartTooltipContent />} /></PieChart></ChartContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>{t('patrolCharts.dailyPatrolCount')}</CardTitle></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[300px]"><BarChart data={last7Days}><XAxis dataKey="date" /><YAxis /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>{t('patrolCharts.alarmSeverity')}</CardTitle></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[300px]"><PieChart><Pie data={alarmData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>{alarmData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}</Pie><ChartTooltip content={<ChartTooltipContent />} /></PieChart></ChartContainer></CardContent></Card>
      </div>
    </div>
  );
};

export default PatrolCharts;
