import { useState } from "react";
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
import { zhCN } from "date-fns/locale";

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--muted))"];
const STATUS_COLORS: Record<string, string> = {
  present: "hsl(142, 76%, 36%)",
  absent: "hsl(0, 84%, 60%)",
  late: "hsl(45, 93%, 47%)",
  leave: "hsl(217, 91%, 60%)",
};

export default function AttendanceReport() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString().padStart(2, "0"));
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1));
  const monthEnd = endOfMonth(monthStart);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: attendanceData = [], isLoading } = useQuery({
    queryKey: ["attendance-report", selectedYear, selectedMonth, selectedProject],
    queryFn: async () => {
      let query = supabase
        .from("attendance")
        .select(`*, guards (name, employee_id), projects (name)`)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));

      if (selectedProject !== "all") {
        query = query.eq("project_id", selectedProject);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["project-assignments-report", selectedProject],
    queryFn: async () => {
      let query = supabase.from("project_assignments").select(`*, guards (name, employee_id), projects (name)`);
      if (selectedProject !== "all") {
        query = query.eq("project_id", selectedProject);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Query anomalous site_attendance records for the month
  const { data: anomalousRecords = [] } = useQuery({
    queryKey: ["site-attendance-anomalous", selectedYear, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_attendance")
        .select("*, guards(name, employee_id), sites(name)")
        .in("status", ["system_auto_closed", "late_close"])
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate statistics
  const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter((d) => !isWeekend(d)).length;
  const totalExpectedRecords = assignments.length * workingDays;
  
  const statusCounts = attendanceData.reduce((acc, record) => {
    acc[record.status] = (acc[record.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const presentCount = statusCounts.present || 0;
  const absentCount = statusCounts.absent || 0;
  const lateCount = statusCounts.late || 0;
  const leaveCount = statusCounts.leave || 0;
  const totalRecords = attendanceData.length;
  const attendanceRate = totalRecords > 0 ? ((presentCount + lateCount) / totalRecords * 100).toFixed(1) : "0";

  // Pie chart data
  const pieData = [
    { name: "出勤", value: presentCount, color: STATUS_COLORS.present },
    { name: "缺勤", value: absentCount, color: STATUS_COLORS.absent },
    { name: "迟到", value: lateCount, color: STATUS_COLORS.late },
    { name: "请假", value: leaveCount, color: STATUS_COLORS.leave },
  ].filter((d) => d.value > 0);

  // Daily attendance chart data
  const dailyData = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayRecords = attendanceData.filter((r) => r.date === dateStr);
    return {
      date: format(date, "MM/dd"),
      出勤: dayRecords.filter((r) => r.status === "present").length,
      缺勤: dayRecords.filter((r) => r.status === "absent").length,
      迟到: dayRecords.filter((r) => r.status === "late").length,
      请假: dayRecords.filter((r) => r.status === "leave").length,
    };
  });

  // Project summary data
  const projectSummary = projects.map((project) => {
    const projectRecords = attendanceData.filter((r) => r.project_id === project.id);
    const projectAssignments = assignments.filter((a: any) => a.project_id === project.id);
    const pPresent = projectRecords.filter((r) => r.status === "present").length;
    const pLate = projectRecords.filter((r) => r.status === "late").length;
    const pAbsent = projectRecords.filter((r) => r.status === "absent").length;
    const pLeave = projectRecords.filter((r) => r.status === "leave").length;
    const pTotal = projectRecords.length;
    const rate = pTotal > 0 ? ((pPresent + pLate) / pTotal * 100).toFixed(1) : "0";
    
    return {
      id: project.id,
      name: project.name,
      totalGuards: projectAssignments.length,
      present: pPresent,
      late: pLate,
      absent: pAbsent,
      leave: pLeave,
      total: pTotal,
      rate: parseFloat(rate),
    };
  }).filter((p) => selectedProject === "all" || p.id === selectedProject);

  // Guard detail data
  const guardDetails = Object.values(
    attendanceData.reduce((acc, record) => {
      const key = record.guard_id;
      if (!acc[key]) {
        acc[key] = {
          guardId: key,
          name: record.guards?.name || "未知",
          employeeId: record.guards?.employee_id || "-",
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          total: 0,
        };
      }
      acc[key][record.status]++;
      acc[key].total++;
      return acc;
    }, {} as Record<string, any>)
  );

  const years = Array.from({ length: 5 }, (_, i) => (currentDate.getFullYear() - 2 + i).toString());
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, "0"),
    label: `${i + 1}月`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">考勤统计报表</h1>
          <p className="text-muted-foreground">查看各项目的月度出勤率和缺勤情况汇总</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}年</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择项目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部项目</SelectItem>
              {projects.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  出勤率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{attendanceRate}%</div>
                <Progress value={parseFloat(attendanceRate)} className="mt-2 h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  总记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRecords}</div>
                <p className="text-xs text-muted-foreground">本月考勤记录</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-500" />
                  出勤
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{presentCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserX className="h-4 w-4 text-red-500" />
                  缺勤
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{absentCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  迟到
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  请假
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{leaveCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>每日考勤趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="出勤" stackId="a" fill={STATUS_COLORS.present} />
                      <Bar dataKey="迟到" stackId="a" fill={STATUS_COLORS.late} />
                      <Bar dataKey="缺勤" stackId="a" fill={STATUS_COLORS.absent} />
                      <Bar dataKey="请假" stackId="a" fill={STATUS_COLORS.leave} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>考勤分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      暂无数据
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>项目考勤汇总</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>项目名称</TableHead>
                    <TableHead className="text-center">保安人数</TableHead>
                    <TableHead className="text-center">出勤</TableHead>
                    <TableHead className="text-center">迟到</TableHead>
                    <TableHead className="text-center">缺勤</TableHead>
                    <TableHead className="text-center">请假</TableHead>
                    <TableHead className="text-center">出勤率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectSummary.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-center">{p.totalGuards}</TableCell>
                        <TableCell className="text-center text-green-600">{p.present}</TableCell>
                        <TableCell className="text-center text-yellow-600">{p.late}</TableCell>
                        <TableCell className="text-center text-red-600">{p.absent}</TableCell>
                        <TableCell className="text-center text-blue-600">{p.leave}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={p.rate >= 90 ? "default" : p.rate >= 70 ? "secondary" : "destructive"}>
                            {p.rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Guard Detail Table */}
          <Card>
            <CardHeader>
              <CardTitle>保安考勤明细</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>工号</TableHead>
                    <TableHead className="text-center">出勤</TableHead>
                    <TableHead className="text-center">迟到</TableHead>
                    <TableHead className="text-center">缺勤</TableHead>
                    <TableHead className="text-center">请假</TableHead>
                    <TableHead className="text-center">出勤率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guardDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    guardDetails.map((g: any) => {
                      const rate = g.total > 0 ? ((g.present + g.late) / g.total * 100).toFixed(1) : "0";
                      return (
                        <TableRow key={g.guardId}>
                          <TableCell className="font-medium">{g.name}</TableCell>
                          <TableCell>{g.employeeId}</TableCell>
                          <TableCell className="text-center text-green-600">{g.present}</TableCell>
                          <TableCell className="text-center text-yellow-600">{g.late}</TableCell>
                          <TableCell className="text-center text-red-600">{g.absent}</TableCell>
                          <TableCell className="text-center text-blue-600">{g.leave}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={parseFloat(rate) >= 90 ? "default" : parseFloat(rate) >= 70 ? "secondary" : "destructive"}>
                              {rate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {/* Anomalous Site Attendance Records */}
          {anomalousRecords.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  站点考勤异常记录（需人工复核）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日期</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>工号</TableHead>
                      <TableHead>站点</TableHead>
                      <TableHead className="text-center">签到</TableHead>
                      <TableHead className="text-center">签退</TableHead>
                      <TableHead className="text-center">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anomalousRecords.map((r: any) => (
                      <TableRow key={r.id} className="bg-destructive/5">
                        <TableCell>{r.date}</TableCell>
                        <TableCell className="font-medium">{r.guards?.name || '-'}</TableCell>
                        <TableCell>{r.guards?.employee_id || '-'}</TableCell>
                        <TableCell>{r.sites?.name || '-'}</TableCell>
                        <TableCell className="text-center">
                          {r.check_in_time ? format(new Date(r.check_in_time), 'HH:mm') : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.check_out_time ? format(new Date(r.check_out_time), 'HH:mm') : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive" className="text-xs">
                            {r.status === 'system_auto_closed' ? '系统截断' : '补签退'}
                          </Badge>
                        </TableCell>
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