import { 
  Home, Users, MapPin, ClipboardList, 
  FileText, Bell, Calendar, Shield,
  Settings, UserCog, History,
  BarChart3, CalendarDays, PieChart
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

const setupItems = [
  { title: '公司设置', url: '/companies', icon: Users },
  { title: '顾客/项目', url: '/projects', icon: Shield },
  { title: '站点管理', url: '/sites', icon: MapPin },
  { title: '巡更内容', url: '/checkpoints', icon: ClipboardList },
  { title: '巡更计划', url: '/setup/plan', icon: Calendar },
  { title: '消息中心', url: '/notices', icon: Bell },
];

const basicItems = [
  { title: '巡更报告', url: '/basic/report', icon: FileText },
  { title: '巡更历史', url: '/basic/history', icon: History },
  { title: '巡更统计', url: '/basic/charts', icon: BarChart3 },
  { title: '巡更日历', url: '/basic/calendar', icon: CalendarDays },
];

const dataItems = [
  { title: '考勤统计', url: '/data/attendance-report', icon: PieChart },
  { title: '系统管理', url: '/data/system', icon: Settings },
  { title: '用户与权限', url: '/data/user', icon: UserCog },
];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-60'}>
      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard" end>
                    <Home className="h-4 w-4" />
                    {!collapsed && <span>仪表板</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Setup Section */}
        <SidebarGroup>
          <SidebarGroupLabel>初始设置</SidebarGroupLabel>
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

        {/* Basic Operations */}
        <SidebarGroup>
          <SidebarGroupLabel>巡更操作</SidebarGroupLabel>
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

        {/* Data Management */}
        <SidebarGroup>
          <SidebarGroupLabel>资料设置</SidebarGroupLabel>
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
