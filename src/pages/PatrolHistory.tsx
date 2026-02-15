import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["patrol-history", statusFilter, dateFilter],
    queryFn: async () => {
      let query = supabase.from("patrol_reports").select(`*, profiles!guard_id(full_name, employee_id), sites(name), patrol_plans(name)`).order("start_time", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (dateFilter) {
        const startDate = new Date(dateFilter);
        const endDate = new Date(dateFilter);
        endDate.setDate(endDate.getDate() + 1);
        query = query.gte("start_time", startDate.toISOString()).lt("start_time", endDate.toISOString());
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredReports = reports?.filter((report: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return report.profiles?.full_name?.toLowerCase().includes(term) || report.sites?.name?.toLowerCase().includes(term) || report.patrol_plans?.name?.toLowerCase().includes(term);
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive"; labelKey: string }> = {
      completed: { variant: "default", labelKey: "dashboard.statusCompleted" },
      in_progress: { variant: "secondary", labelKey: "dashboard.statusInProgress" },
      missed: { variant: "destructive", labelKey: "dashboard.statusMissed" },
    };
    const { variant, labelKey } = config[status] || { variant: "secondary" as const, labelKey: status };
    return <Badge variant={variant}>{t(labelKey)}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('patrolHistory.title')}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>{t('patrolHistory.filterConditions')}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('patrolHistory.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder={t('patrolHistory.statusFilter')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allStatus')}</SelectItem>
                <SelectItem value="completed">{t('dashboard.statusCompleted')}</SelectItem>
                <SelectItem value="in_progress">{t('dashboard.statusInProgress')}</SelectItem>
                <SelectItem value="missed">{t('dashboard.statusMissed')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="pl-10 w-[180px]" />
            </div>
            {(statusFilter !== "all" || dateFilter) && (
              <Button variant="outline" onClick={() => { setStatusFilter("all"); setDateFilter(""); }}>{t('common.clearFilter')}</Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
          ) : filteredReports && filteredReports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('patrolReports.startTime')}</TableHead>
                  <TableHead>{t('patrolReports.guard')}</TableHead>
                  <TableHead>{t('patrolReports.site')}</TableHead>
                  <TableHead>{t('patrol.plan')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('patrolHistory.duration')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report: any) => {
                  const duration = report.end_time ? Math.round((new Date(report.end_time).getTime() - new Date(report.start_time).getTime()) / 60000) : null;
                  return (
                    <TableRow key={report.id}>
                      <TableCell>{format(new Date(report.start_time), "yyyy-MM-dd HH:mm")}</TableCell>
                      <TableCell>{report.profiles?.full_name || "-"}</TableCell>
                      <TableCell>{report.sites?.name || "-"}</TableCell>
                      <TableCell>{report.patrol_plans?.name || "-"}</TableCell>
                      <TableCell>{getStatusBadge(report.status || "in_progress")}</TableCell>
                      <TableCell>{duration ? `${duration} ${t('patrolHistory.minutes')}` : "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/patrol/detail/${report.id}`)}>
                          <Eye className="h-4 w-4 mr-1" />{t('common.view')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('patrolHistory.noRecords')}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatrolHistory;
