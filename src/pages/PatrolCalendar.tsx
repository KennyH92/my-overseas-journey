import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";

const PatrolCalendar = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const dateLocale = i18n.language === 'zh' ? zhCN : enUS;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: reports } = useQuery({
    queryKey: ["patrol-calendar", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase.from("patrol_reports").select(`*, guards(name), sites(name)`).gte("start_time", monthStart.toISOString()).lte("start_time", monthEnd.toISOString()).order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOffset = monthStart.getDay();
  const emptyDays = Array.from({ length: firstDayOffset }, (_, i) => i);
  const getReportsForDate = (date: Date) => reports?.filter((r) => isSameDay(new Date(r.start_time), date)) || [];
  const selectedReports = selectedDate ? getReportsForDate(selectedDate) : [];
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = { completed: "bg-green-500", in_progress: "bg-yellow-500", missed: "bg-red-500" };
    return colors[status] || "bg-gray-500";
  };

  const weekDays = t('patrolCalendar.weekDays', { returnObjects: true }) as string[];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('patrolCalendar.title')}</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{format(currentMonth, "yyyy MMMM", { locale: dateLocale })}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day: string) => (<div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>))}
              {emptyDays.map((i) => (<div key={`empty-${i}`} className="aspect-square" />))}
              {days.map((day) => {
                const dayReports = getReportsForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDate(day)} className={`aspect-square p-1 rounded-lg border transition-colors relative ${isSelected ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"} ${isToday ? "ring-2 ring-primary ring-offset-2" : ""} ${!isSameMonth(day, currentMonth) ? "opacity-50" : ""}`}>
                    <span className="text-sm">{format(day, "d")}</span>
                    {dayReports.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                        {dayReports.slice(0, 3).map((r, i) => (<div key={i} className={`w-1.5 h-1.5 rounded-full ${getStatusColor(r.status || "")}`} />))}
                        {dayReports.length > 3 && (<span className="text-xs text-muted-foreground">+{dayReports.length - 3}</span>)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{selectedDate ? format(selectedDate, "MM/dd", { locale: dateLocale }) : t('patrolCalendar.selectDateHint')}</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              selectedReports.length > 0 ? (
                <div className="space-y-3">
                  {selectedReports.map((report) => (
                    <div key={report.id} className="p-3 rounded-lg border bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{report.guards?.name || t('common.unknown')}</span>
                        <Badge variant={report.status === "completed" ? "default" : report.status === "missed" ? "destructive" : "secondary"}>
                          {report.status === "completed" ? t('dashboard.statusCompleted') : report.status === "missed" ? t('dashboard.statusMissed') : t('dashboard.statusInProgress')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{report.sites?.name || t('dashboard.unknownSite')}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(report.start_time), "HH:mm")}{report.end_time && ` - ${format(new Date(report.end_time), "HH:mm")}`}</p>
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate(`/patrol/detail/${report.id}`)}>
                        <Eye className="h-4 w-4 mr-1" />{t('patrolCalendar.viewDetails')}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (<p className="text-center text-muted-foreground py-8">{t('patrolCalendar.noRecordsForDay')}</p>)
            ) : (<p className="text-center text-muted-foreground py-8">{t('patrolCalendar.clickDateHint')}</p>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatrolCalendar;
