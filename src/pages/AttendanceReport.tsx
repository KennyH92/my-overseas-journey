import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, UserCheck, UserX, Clock, TrendingUp, Calendar, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  present: "hsl(142, 76%, 36%)",
  absent: "hsl(0, 84%, 60%)",
  late: "hsl(45, 93%, 47%)",
  leave: "hsl(217, 91%, 60%)",
};

export default function AttendanceReport() {
  const { t } = useTranslation();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString().padStart(2, "0"));
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1));
  const monthEnd = endOfMonth(monthStart);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => { const { data, error } = await supabase.from("projects").select("*").eq("status", "active").order("name"); if (error) throw error; return data || []; },
  });

  const { data: attendanceData = [], isLoading } = useQuery({
    queryKey: ["attendance-report", selectedYear, selectedMonth, selectedProject],
    queryFn: async () => {
      let query = supabase.from("attendance").select(`*, profiles!guard_id(full_name, employee_id), projects(name)`).gte("date", format(monthStart, "yyyy-MM-dd")).lte("date", format(monthEnd, "yyyy-MM-dd"));
      if (selectedProject !== "all") { query = query.eq("project_id", selectedProject); }
      const { data, error } = await query; if (error) throw error; return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["project-assignments-report", selectedProject],
    queryFn: async () => { let query = supabase.from("project_assignments").select(`*, profiles!guard_id(full_name, employee_id), projects(name)`); if (selectedProject !== "all") { query = query.eq("project_id", selectedProject); } const { data, error } = await query; if (error) throw error; return data || []; },
  });

  const { data: anomalousRecords = [] } = useQuery({
    queryKey: ["site-attendance-anomalous", selectedYear, selectedMonth],
    queryFn: async () => { const { data, error } = await supabase.from("site_attendance").select("*, profiles!guard_id(full_name, employee_id), sites(name)").in("status", ["system_auto_closed", "late_close"]).gte("date", format(monthStart, "yyyy-MM-dd")).lte("date", format(monthEnd, "yyyy-MM-dd")).order("date", { ascending: false }); if (error) throw error; return data || []; },
  });

  const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter((d) => !isWeekend(d)).length;
  const statusCounts = attendanceData.reduce((acc: any, record: any) => { acc[record.status] = (acc[record.status] || 0) + 1; return acc; }, {} as Record<string, number>);
  const presentCount = statusCounts.present || 0;
  const absentCount = statusCounts.absent || 0;
  const lateCount = statusCounts.late || 0;
  const leaveCount = statusCounts.leave || 0;
  const totalRecords = attendanceData.length;
  const attendanceRate = totalRecords > 0 ? ((presentCount + lateCount) / totalRecords * 100).toFixed(1) : "0";

  const pieData = [
    { name: t('attendance.present'), value: presentCount, color: STATUS_COLORS.present },
    { name: t('attendance.absent'), value: absentCount, color: STATUS_COLORS.absent },
    { name: t('attendance.late'), value: lateCount, color: STATUS_COLORS.late },
    { name: t('attendance.leave'), value: leaveCount, color: STATUS_COLORS.leave },
  ].filter((d) => d.value > 0);

  const dailyData = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayRecords = attendanceData.filter((r: any) => r.date === dateStr);
    return {
      date: format(date, "MM/dd"),
      [t('attendance.present')]: dayRecords.filter((r: any) => r.status === "present").length,
      [t('attendance.absent')]: dayRecords.filter((r: any) => r.status === "absent").length,
      [t('attendance.late')]: dayRecords.filter((r: any) => r.status === "late").length,
      [t('attendance.leave')]: dayRecords.filter((r: any) => r.status === "leave").length,
    };
  });

  const projectSummary = projects.map((project: any) => {
    const projectRecords = attendanceData.filter((r: any) => r.project_id === project.id);
    const projectAssignments = assignments.filter((a: any) => a.project_id === project.id);
    const pPresent = projectRecords.filter((r: any) => r.status === "present").length;
    const pLate = projectRecords.filter((r: any) => r.status === "late").length;
    const pAbsent = projectRecords.filter((r: any) => r.status === "absent").length;
    const pLeave = projectRecords.filter((r: any) => r.status === "leave").length;
    const pTotal = projectRecords.length;
    const rate = pTotal > 0 ? ((pPresent + pLate) / pTotal * 100).toFixed(1) : "0";
    return { id: project.id, name: project.name, totalGuards: projectAssignments.length, present: pPresent, late: pLate, absent: pAbsent, leave: pLeave, total: pTotal, rate: parseFloat(rate) };
  }).filter((p: any) => selectedProject === "all" || p.id === selectedProject);

  const guardDetails = Object.values(
    attendanceData.reduce((acc: any, record: any) => {
      const key = record.guard_id;
      if (!acc[key]) { acc[key] = { guardId: key, name: record.profiles?.full_name || t('common.unknown'), employeeId: record.profiles?.employee_id || "-", present: 0, absent: 0, late: 0, leave: 0, total: 0 }; }
      acc[key][record.status]++; acc[key].total++; return acc;
    }, {} as Record<string, any>)
  );

  const years = Array.from({ length: 5 }, (_, i) => (currentDate.getFullYear() - 2 + i).toString());
  const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString().padStart(2, "0"), label: `${i + 1}${t('common.month')}` }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('attendance.title')}</h1>
          <p className="text-muted-foreground">{t('attendance.description')}</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((year) => (<SelectItem key={year} value={year}>{year}{t('common.year')}</SelectItem>))}</SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
          </Select>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-40"><SelectValue placeholder={t('common.selectProject')} /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t('common.allProjects')}</SelectItem>{projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">{t('common.loading')}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />{t('attendance.attendanceRate')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{attendanceRate}%</div><Progress value={parseFloat(attendanceRate)} className="mt-2 h-2" /></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" />{t('attendance.totalRecords')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalRecords}</div><p className="text-xs text-muted-foreground">{t('attendance.monthlyRecords')}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><UserCheck className="h-4 w-4 text-green-500" />{t('attendance.present')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{presentCount}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><UserX className="h-4 w-4 text-red-500" />{t('attendance.absent')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{absentCount}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-yellow-500" />{t('attendance.late')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{lateCount}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-500" />{t('attendance.leave')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{leaveCount}</div></CardContent></Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>{t('attendance.dailyTrend')}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend />
                      <Bar dataKey={t('attendance.present')} stackId="a" fill={STATUS_COLORS.present} />
                      <Bar dataKey={t('attendance.late')} stackId="a" fill={STATUS_COLORS.late} />
                      <Bar dataKey={t('attendance.absent')} stackId="a" fill={STATUS_COLORS.absent} />
                      <Bar dataKey={t('attendance.leave')} stackId="a" fill={STATUS_COLORS.leave} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t('attendance.distribution')}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip /></PieChart>
                    </ResponsiveContainer>
                  ) : (<div className="h-full flex items-center justify-center text-muted-foreground">{t('common.noData')}</div>)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>{t('attendance.projectSummary')}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('projects.projectName')}</TableHead><TableHead className="text-center">{t('attendance.guardCount')}</TableHead>
                  <TableHead className="text-center">{t('attendance.present')}</TableHead><TableHead className="text-center">{t('attendance.late')}</TableHead>
                  <TableHead className="text-center">{t('attendance.absent')}</TableHead><TableHead className="text-center">{t('attendance.leave')}</TableHead>
                  <TableHead className="text-center">{t('attendance.attendanceRate')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {projectSummary.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
                  ) : projectSummary.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-center">{p.totalGuards}</TableCell>
                      <TableCell className="text-center text-green-600">{p.present}</TableCell><TableCell className="text-center text-yellow-600">{p.late}</TableCell>
                      <TableCell className="text-center text-red-600">{p.absent}</TableCell><TableCell className="text-center text-blue-600">{p.leave}</TableCell>
                      <TableCell className="text-center"><Badge variant={p.rate >= 90 ? "default" : p.rate >= 70 ? "secondary" : "destructive"}>{p.rate}%</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('attendance.guardDetail')}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('common.name')}</TableHead><TableHead>{t('common.employeeId')}</TableHead>
                  <TableHead className="text-center">{t('attendance.present')}</TableHead><TableHead className="text-center">{t('attendance.late')}</TableHead>
                  <TableHead className="text-center">{t('attendance.absent')}</TableHead><TableHead className="text-center">{t('attendance.leave')}</TableHead>
                  <TableHead className="text-center">{t('attendance.attendanceRate')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {guardDetails.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
                  ) : guardDetails.map((g: any) => {
                    const rate = g.total > 0 ? ((g.present + g.late) / g.total * 100).toFixed(1) : "0";
                    return (
                      <TableRow key={g.guardId}>
                        <TableCell className="font-medium">{g.name}</TableCell><TableCell>{g.employeeId}</TableCell>
                        <TableCell className="text-center text-green-600">{g.present}</TableCell><TableCell className="text-center text-yellow-600">{g.late}</TableCell>
                        <TableCell className="text-center text-red-600">{g.absent}</TableCell><TableCell className="text-center text-blue-600">{g.leave}</TableCell>
                        <TableCell className="text-center"><Badge variant={parseFloat(rate) >= 90 ? "default" : parseFloat(rate) >= 70 ? "secondary" : "destructive"}>{rate}%</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {anomalousRecords.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />{t('attendance.anomalousTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('common.date')}</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>{t('common.employeeId')}</TableHead>
                    <TableHead>{t('patrol.site')}</TableHead><TableHead className="text-center">{t('attendance.checkIn')}</TableHead>
                    <TableHead className="text-center">{t('attendance.checkOut')}</TableHead><TableHead className="text-center">{t('common.status')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {anomalousRecords.map((r: any) => (
                      <TableRow key={r.id} className="bg-destructive/5">
                        <TableCell>{r.date}</TableCell><TableCell className="font-medium">{r.profiles?.full_name || '-'}</TableCell><TableCell>{r.profiles?.employee_id || '-'}</TableCell>
                        <TableCell>{r.sites?.name || '-'}</TableCell>
                        <TableCell className="text-center">{r.check_in_time ? format(new Date(r.check_in_time), 'HH:mm') : '-'}</TableCell>
                        <TableCell className="text-center">{r.check_out_time ? format(new Date(r.check_out_time), 'HH:mm') : '-'}</TableCell>
                        <TableCell className="text-center"><Badge variant="destructive" className="text-xs">{r.status === 'system_auto_closed' ? t('attendance.systemClosed') : t('attendance.manualClose')}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
