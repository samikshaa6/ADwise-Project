import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Map, 
  List, 
  Calendar, 
  BarChart3, 
  Building2, 
  Eye,
  MapPin 
} from 'lucide-react';
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
import { useAuth } from '@/lib/auth';

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile } = useAuth();
  
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';
  
  const isActive = (path: string) => currentPath === path;
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-accent hover:text-accent-foreground";

  // Customer specific items
  const customerItems = [
    { title: "Home Page", url: "/", icon: Map },
    { title: "Listings", url: "/listings", icon: List },
    { title: "My Bookings", url: "/my-bookings", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: Eye },
  ];

  // Owner specific items  
  const ownerItems = [
    { title: "Dashboard", url: "/", icon: BarChart3 },
    { title: "My Billboards", url: "/owner/billboards", icon: Building2 },
    { title: "Bookings", url: "/owner/bookings", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: Eye },
  ];

  const items = profile?.role === 'owner' 
    ? ownerItems
    : customerItems;

  console.log('AppSidebar - Current profile role:', profile?.role);
  console.log('AppSidebar - Items being shown:', items.map(i => i.title));

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-4 py-4">
          <MapPin className="h-6 w-6 text-primary" />
          {!collapsed && (
            <span className="text-lg font-semibold">AdWise</span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>
            {profile?.role === 'owner' ? 'Billboard Manager' : 'Advertiser'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavCls}
                      onClick={() => console.log('Navigating to:', item.url, 'Title:', item.title)}
                    >
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