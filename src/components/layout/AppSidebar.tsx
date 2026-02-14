import { useTranslation } from 'react-i18next';
import { 
  Home, Users, MapPin, ClipboardList, 
  FileText, Bell, Calendar, Shield,
  Settings, UserCog, History,
  BarChart3, CalendarDays, PieChart, ScanLine
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { t } = useTranslation();

  const setupItems = [
    { title: t('nav.companies'), url: '/companies', icon: Users },
    { title: t('nav.projects'), url: '/projects', icon: Shield },
    { title: t('nav.sites'), url: '/sites', icon: MapPin },
    { title: t('nav.patrolPlan'), url: '/setup/plan', icon: Calendar },
    { title: t('nav.notices'), url: '/notices', icon: Bell },
  ];

  const basicItems = [
    { title: t('nav.patrolReport'), url: '/basic/report', icon: FileText },
    { title: t('nav.patrolHistory'), url: '/basic/history', icon: History },
    { title: t('nav.patrolCharts'), url: '/basic/charts', icon: BarChart3 },
    { title: t('nav.patrolCalendar'), url: '/basic/calendar', icon: CalendarDays },
  ];

  const dataItems = [
    { title: t('nav.attendanceReport'), url: '/data/attendance-report', icon: PieChart },
    { title: t('nav.systemManagement'), url: '/data/system', icon: Settings },
    { title: t('nav.userManagement'), url: '/data/user', icon: UserCog },
  ];

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-60'}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard" end>
                    <Home className="h-4 w-4" />
                    {!collapsed && <span>{t('nav.dashboard')}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/scan-checkin">
                    <ScanLine className="h-4 w-4" />
                    {!collapsed && <span>{t('nav.scanCheckIn')}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.setup')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {setupItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.operations')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {basicItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.dataManagement')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
