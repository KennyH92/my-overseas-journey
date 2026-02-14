import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Clock, User, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const PatrolDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: report, isLoading } = useQuery({
    queryKey: ["patrol-report", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("patrol_reports").select(`*, guards(name, employee_id), sites(name, address), patrol_plans(name)`).eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: checkpoints } = useQuery({
    queryKey: ["patrol-checkpoints", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("patrol_report_checkpoints").select(`*, checkpoints(name, code)`).eq("report_id", id!).order("visited_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = { completed: "default", in_progress: "secondary", missed: "destructive" };
    const labelKeys: Record<string, string> = { completed: "dashboard.statusCompleted", in_progress: "dashboard.statusInProgress", missed: "dashboard.statusMissed" };
    return <Badge variant={variants[status] || "outline"}>{t(labelKeys[status] || status)}</Badge>;
  };

  if (isLoading) return (<div className="p-6 space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>);
  if (!report) return (<div className="p-6"><Card><CardContent className="pt-6 text-center text-muted-foreground">{t('patrolDetail.reportNotFound')}</CardContent></Card></div>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">{t('patrolDetail.title')}</h1>
        {getStatusBadge(report.status || "in_progress")}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">{t('patrolDetail.basicInfo')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('patrolDetail.patroller')}</p>
                <p className="font-medium">{report.guards?.name || t('patrolDetail.unassigned')}</p>
                {report.guards?.employee_id && <p className="text-xs text-muted-foreground">{t('common.employeeId')}: {report.guards.employee_id}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('patrolDetail.patrolSite')}</p>
                <p className="font-medium">{report.sites?.name || t('dashboard.unknownSite')}</p>
                {report.sites?.address && <p className="text-xs text-muted-foreground">{report.sites.address}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('patrolDetail.patrolTime')}</p>
                <p className="font-medium">{format(new Date(report.start_time), "yyyy-MM-dd HH:mm")}{report.end_time && ` - ${format(new Date(report.end_time), "HH:mm")}`}</p>
              </div>
            </div>
            {report.patrol_plans?.name && <div><p className="text-sm text-muted-foreground">{t('patrolDetail.patrolPlan')}</p><p className="font-medium">{report.patrol_plans.name}</p></div>}
            {report.notes && <div><p className="text-sm text-muted-foreground">{t('common.notes')}</p><p className="font-medium">{report.notes}</p></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">{t('patrolDetail.checkpointRecords')}</CardTitle></CardHeader>
          <CardContent>
            {checkpoints && checkpoints.length > 0 ? (
              <div className="space-y-3">
                {checkpoints.map((cp, index) => (
                  <div key={cp.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cp.checkpoints?.name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(cp.visited_at), "HH:mm:ss")}</p>
                    </div>
                    {cp.status === "completed" ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-yellow-500" />}
                  </div>
                ))}
              </div>
            ) : (<p className="text-center text-muted-foreground py-4">{t('patrolDetail.noCheckpoints')}</p>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatrolDetail;
