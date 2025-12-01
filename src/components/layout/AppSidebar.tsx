import { 
  Home, Settings, Users, MapPin, ClipboardList, 
  FileText, Bell, MapPinned, Calendar, FileBarChart,
  Shield, Database, UserCog, BarChart3
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
  { title: '公司设置', url: '/setup/company', icon: Users },
  { title: '保安管理', url: '/setup/guards', icon: Shield },
  { title: '保安设备', url: '/setup/site', icon: MapPin },
  { title: '巡更内容', url: '/setup/content', icon: ClipboardList },
  { title: '巡更计划', url: '/setup/plan', icon: Calendar },
  { title: '消息中心', url: '/setup/notice', icon: Bell },
];

const basicItems = [
  { title: '巡更报告', url: '/basic/report', icon: FileText },
  { title: '巡更详情', url: '/basic/detail', icon: FileBarChart },
  { title: '巡更历史', url: '/basic/history', icon: ClipboardList },
  { title: '巡更图表', url: '/basic/chart', icon: BarChart3 },
  { title: '巡更遗漏', url: '/basic/omit', icon: FileText },
  { title: '告警中心', url: '/basic/alarm', icon: Bell },
  { title: '实时地图', url: '/basic/realmap', icon: MapPinned },
  { title: '巡更日历', url: '/basic/calendar', icon: Calendar },
  { title: '系统日志', url: '/basic/log', icon: FileText },
];

const dataItems = [
  { title: '设备管理', url: '/data/device', icon: Database },
  { title: '系统管理', url: '/data/system', icon: Settings },
  { title: '角色权限', url: '/data/role', icon: UserCog },
  { title: '用户管理', url: '/data/user', icon: Users },
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
