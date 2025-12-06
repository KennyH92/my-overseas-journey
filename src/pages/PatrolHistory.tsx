import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";

const PatrolHistory = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["patrol-history", statusFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("patrol_reports")
        .select(`
          *,
          guards(name, employee_id),
          sites(name),
          patrol_plans(name)
        `)
        .order("start_time", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (dateFilter) {
        const startDate = new Date(dateFilter);
        const endDate = new Date(dateFilter);
        endDate.setDate(endDate.getDate() + 1);
        query = query
          .gte("start_time", startDate.toISOString())
          .lt("start_time", endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredReports = reports?.filter((report) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      report.guards?.name?.toLowerCase().includes(term) ||
      report.sites?.name?.toLowerCase().includes(term) ||
      report.patrol_plans?.name?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      completed: { variant: "default", label: "已完成" },
      in_progress: { variant: "secondary", label: "进行中" },
      missed: { variant: "destructive", label: "已错过" },
    };
    const { variant, label } = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">巡逻历史</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索巡逻员、站点..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="missed">已错过</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 w-[180px]"
              />
            </div>
            {(statusFilter !== "all" || dateFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setDateFilter("");
                }}
              >
                清除筛选
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : filteredReports && filteredReports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>巡逻时间</TableHead>
                  <TableHead>巡逻员</TableHead>
                  <TableHead>站点</TableHead>
                  <TableHead>计划</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时长</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => {
                  const duration = report.end_time
                    ? Math.round(
                        (new Date(report.end_time).getTime() - new Date(report.start_time).getTime()) / 60000
                      )
                    : null;
                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        {format(new Date(report.start_time), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                      <TableCell>{report.guards?.name || "-"}</TableCell>
                      <TableCell>{report.sites?.name || "-"}</TableCell>
                      <TableCell>{report.patrol_plans?.name || "-"}</TableCell>
                      <TableCell>{getStatusBadge(report.status || "in_progress")}</TableCell>
                      <TableCell>{duration ? `${duration}分钟` : "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/patrol/detail/${report.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">暂无巡逻记录</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatrolHistory;
